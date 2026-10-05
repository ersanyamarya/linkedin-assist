import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ERROR_WORD = /\berror\b/i;
const SEMVER_LIKE = /^\d+(\.\d+){0,3}$/;

const ROOT = resolve(import.meta.dir, "..");
const DIST = join(ROOT, "dist");

type Manifest = {
	name?: string;
	version?: string;
	manifest_version?: number;
	content_scripts?: { js?: string[]; css?: string[] }[];
	background?: { service_worker?: string };
	options_ui?: { page?: string };
};

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

const walk = (dir: string): string[] =>
	readdirSync(dir).flatMap((entry) => {
		const full = join(dir, entry);
		return statSync(full).isDirectory() ? [full, ...walk(full)] : [full];
	});

let build: { exitCode: number; output: string };

beforeAll(async () => {
	const proc = Bun.spawn(["bun", "run", "build"], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
	build = { exitCode, output: `${stdout}\n${stderr}` };
}, 120_000);

describe("bun run build", () => {
	test("exits 0 with no errors", () => {
		expect(build.exitCode).toBe(0);
		expect(build.output).not.toMatch(ERROR_WORD);
	});
});

describe("dist/manifest.json", () => {
	test("is valid JSON with name, version and manifest_version", () => {
		const manifest = readJson<Manifest>(join(DIST, "manifest.json"));
		expect(manifest.name).toBeTruthy();
		expect(manifest.version).toMatch(SEMVER_LIKE);
		expect(manifest.manifest_version).toBe(3);
	});

	test("every file it references exists in dist/", () => {
		const manifest = readJson<Manifest>(join(DIST, "manifest.json"));
		const refs = [
			...(manifest.content_scripts ?? []).flatMap((script) => [...(script.js ?? []), ...(script.css ?? [])]),
			manifest.background?.service_worker,
			manifest.options_ui?.page,
		].filter((ref): ref is string => Boolean(ref));

		expect(refs.length).toBeGreaterThan(0);
		const missing = refs.filter((ref) => !existsSync(join(DIST, ref)));
		expect(missing).toEqual([]);
	});

	test("options.html loads scripts that exist", () => {
		const html = readFileSync(join(DIST, "options.html"), "utf8");
		const scripts = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((match) => match[1] as string);
		expect(scripts.length).toBeGreaterThan(0);
		expect(scripts.filter((src) => !existsSync(join(DIST, src)))).toEqual([]);
	});
});

describe("dist/ layout", () => {
	test("has no underscore directories like _.._", () => {
		const bad = walk(DIST)
			.filter((path) => statSync(path).isDirectory())
			.filter((path) => path.split("/").pop()?.startsWith("_"));
		expect(bad).toEqual([]);
	});
});

describe("package.json scripts", () => {
	test("every script file they run exists", () => {
		const { scripts } = readJson<{ scripts: Record<string, string> }>(join(ROOT, "package.json"));
		const files = Object.values(scripts).flatMap((command) => [...command.matchAll(/\bscripts\/[\w.-]+\.cjs\b/g)].map((match) => match[0]));

		expect(files.length).toBeGreaterThan(0);
		expect(files.filter((file) => !existsSync(join(ROOT, file)))).toEqual([]);
	});
});

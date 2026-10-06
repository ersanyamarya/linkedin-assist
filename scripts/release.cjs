"use strict";
// Release helper.
//   node scripts/release.cjs prepare <patch|minor|major|x.y.z> [--dry-run]
//     Bumps the version in public/manifest.json and drafts a CHANGELOG.md section from the
//     commits since the last tag.
//   node scripts/release.cjs [--dry-run] [--yes]
//     Checks everything is ready, then tags the current commit and pushes it. The tag starts
//     the Release workflow. Never creates a commit.
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "public", "manifest.json");
const changelogPath = path.join(root, "CHANGELOG.md");

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const positional = args.filter((arg) => !arg.startsWith("--"));
const dryRun = flags.has("--dry-run");

const SEMVER = /^\d+\.\d+\.\d+$/;
const TODO_MARKER = "TODO: edit before releasing";
const VERSION_FIELD = /("version":\s*")[^"]+(")/;
const GIT_SUFFIX = /\.git$/;
const SSH_PREFIX = /^git@github\.com:/;

const fail = (message) => {
	console.error(`\n${message}`);
	process.exit(1);
};

const git = (...gitArgs) => execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" }).trim();
const readManifest = () => fs.readFileSync(manifestPath, "utf8");
const manifestVersion = () => JSON.parse(readManifest()).version;

const bump = (current, kind) => {
	if (SEMVER.test(kind)) return kind;
	const [major, minor, patch] = current.split(".").map(Number);
	if (kind === "major") return `${major + 1}.0.0`;
	if (kind === "minor") return `${major}.${minor + 1}.0`;
	if (kind === "patch") return `${major}.${minor}.${patch + 1}`;
	return fail("Usage: release:prepare <patch|minor|major|x.y.z>");
};

const lastTag = () => {
	try {
		return execFileSync("git", ["describe", "--tags", "--abbrev=0"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
	} catch {
		return;
	}
};

// Conventional commit subjects -> changelog bullets. Chore, docs, style, test, build, and ci stay out.
const SECTIONS = { feat: "Added", fix: "Fixed", refactor: "Changed", perf: "Changed" };
const COMMIT = /^(?:[^\w\s]+\s*)?(\w+)(?:\([^)]*\))?!?:\s*(.+)$/u;

const draftSection = (version) => {
	const tag = lastTag();
	const range = tag ? [`${tag}..HEAD`] : [];
	const subjects = git("log", ...range, "--no-merges", "--pretty=%s")
		.split("\n")
		.filter(Boolean);
	const grouped = {};
	for (const subject of subjects) {
		const match = COMMIT.exec(subject);
		const heading = match && SECTIONS[match[1]];
		if (!heading) continue;
		const text = match[2].charAt(0).toUpperCase() + match[2].slice(1);
		grouped[heading] = grouped[heading] ?? [];
		grouped[heading].push(`- ${text}`);
	}
	const date = new Date().toISOString().slice(0, 10);
	const body = ["Added", "Changed", "Fixed"]
		.filter((heading) => grouped[heading])
		.map((heading) => `### ${heading}\n\n${grouped[heading].join("\n")}`)
		.join("\n\n");
	const source = tag ? `since ${tag}` : "from the full history";
	return `## [${version}] - ${date}\n\n${TODO_MARKER}. Drafted ${source} from commit messages; write it for users, not for developers.\n\n${body || "- "}\n\n`;
};

const prepare = () => {
	const current = manifestVersion();
	const next = bump(current, positional[1]);
	const changelog = fs.readFileSync(changelogPath, "utf8");
	if (changelog.includes(`## [${next}]`)) fail(`CHANGELOG.md already has a section for ${next}.`);
	if (next === current) fail(`The manifest is already at ${next}.`);

	const section = draftSection(next);
	console.log(`${current} -> ${next}\n\n${section}`);
	if (dryRun) return console.log("Dry run: nothing written.");

	fs.writeFileSync(manifestPath, readManifest().replace(VERSION_FIELD, `$1${next}$2`));
	const firstSection = changelog.indexOf("\n## [");
	const updated =
		firstSection === -1 ? `${changelog.trimEnd()}\n\n${section}` : `${changelog.slice(0, firstSection + 1)}${section}${changelog.slice(firstSection + 1)}`;
	fs.writeFileSync(changelogPath, updated);
	console.log(
		`Updated public/manifest.json and CHANGELOG.md.\nEdit the new CHANGELOG.md section (delete the TODO line), then run \`bun run release\` once it's committed.`
	);
};

const section = (changelog, version) => {
	const lines = changelog.split("\n");
	const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
	if (start === -1) return "";
	const end = lines.findIndex((line, index) => index > start && line.startsWith("## ["));
	return lines
		.slice(start + 1, end === -1 ? undefined : end)
		.join("\n")
		.trim();
};

const run = (label, command, commandArgs) => {
	console.log(`\n> ${label}`);
	const result = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit" });
	if (result.status !== 0) fail(`${label} failed. Fix it and run again.`);
};

const release = async () => {
	const version = manifestVersion();
	const tag = `v${version}`;
	const problems = [];

	if (!SEMVER.test(version)) problems.push(`Manifest version "${version}" is not x.y.z.`);
	const branch = git("rev-parse", "--abbrev-ref", "HEAD");
	if (branch !== "main") problems.push(`You're on "${branch}". Release from main.`);
	if (git("status", "--porcelain")) problems.push("The working tree has uncommitted changes. Everything in the release has to be committed first.");
	const notes = section(fs.readFileSync(changelogPath, "utf8"), version);
	if (!notes) problems.push(`CHANGELOG.md has no section for ${version}. Run release:prepare, or add one.`);
	if (notes.includes("TODO")) problems.push("The CHANGELOG.md section still has the TODO line. Edit the notes and remove it.");
	if (git("tag", "--list", tag)) problems.push(`Tag ${tag} already exists locally.`);
	else if (git("ls-remote", "--tags", "origin", tag)) problems.push(`Tag ${tag} already exists on origin.`);

	if (problems.length) fail(`Not ready to release ${tag}:\n  - ${problems.join("\n  - ")}`);

	run("Security checks", "bun", ["run", "security"]);
	run("Build", "bun", ["run", "build"]);
	run("Tests", "bun", ["test"]);
	run("Lint", "bunx", ["biome", "check", "."]);

	console.log(`\nReady to release ${tag} from ${git("rev-parse", "--short", "HEAD")}.\n\n${notes}\n`);
	if (dryRun) return console.log("Dry run: nothing tagged or pushed.");

	if (!flags.has("--yes")) {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		const answer = await rl.question(`Tag ${tag} and push main and the tag to origin? [y/N] `);
		rl.close();
		if (answer.trim().toLowerCase() !== "y") fail("Cancelled.");
	}

	git("tag", tag);
	execFileSync("git", ["push", "origin", "HEAD"], { cwd: root, stdio: "inherit" });
	execFileSync("git", ["push", "origin", tag], { cwd: root, stdio: "inherit" });
	const remote = git("remote", "get-url", "origin").replace(GIT_SUFFIX, "").replace(SSH_PREFIX, "https://github.com/");
	console.log(`\nPushed ${tag}. Watch the build: ${remote}/actions`);
};

(positional[0] === "prepare" ? Promise.resolve(prepare()) : release()).catch((error) => fail(error instanceof Error ? error.message : String(error)));

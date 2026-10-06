"use strict";
// Zips dist/ into release/netwrite-v<version>.zip, with manifest.json at the zip root.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const manifestPath = path.join(dist, "manifest.json");

if (!fs.existsSync(manifestPath)) {
	console.error("dist/manifest.json is missing. Run `bun run build` first.");
	process.exit(1);
}

const { version } = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const outDir = path.join(root, "release");
const zip = path.join(outDir, `netwrite-v${version}.zip`);

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(zip, { force: true });
execFileSync("zip", ["-r", "-q", "-X", zip, "."], { cwd: dist, stdio: "inherit" });

console.log(`${path.relative(root, zip)}  ${(fs.statSync(zip).size / 1024 / 1024).toFixed(1)} MB`);

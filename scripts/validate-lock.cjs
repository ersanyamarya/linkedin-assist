"use strict";
// Fails when package.json uses a mutable version range (^, ~, *, latest, x-ranges, tags).
const { readFileSync } = require("node:fs");
const pkg = require("../package.json");

const lock = readFileSync("bun.lock", "utf8");

const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const bad = [];

for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
	for (const [name, version] of Object.entries(pkg[field] ?? {})) {
		if (!EXACT.test(version)) bad.push(`${field}.${name}: ${version}`);
		// `bun install --frozen-lockfile` can pass with a stale lock, so check the specifier too.
		if (!lock.includes(`"${name}": "${version}"`)) bad.push(`bun.lock is stale for ${name}@${version}; run bun install`);
	}
}

if (bad.length) {
	console.error(`Mutable dependency versions found:\n  ${bad.join("\n  ")}`);
	process.exit(1);
}
console.log("validate-lock: all dependency versions are pinned.");

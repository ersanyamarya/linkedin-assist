"use strict";
// Fails when a tracked file contains something that looks like a real API key.
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const PATTERNS = [
	["Context7 key", /ctx7sk-[0-9a-f-]{20,}/],
	["Tavily key", /tvly-[A-Za-z0-9_-]{20,}/],
	["OpenAI-style key", /sk-[A-Za-z0-9_-]{32,}/],
	["Anthropic key", /sk-ant-[A-Za-z0-9_-]{20,}/],
	["GitHub token", /gh[pousr]_[A-Za-z0-9]{36,}/],
	["AWS access key", /AKIA[0-9A-Z]{16}/],
	["Private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const hits = [];

for (const file of files) {
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		continue;
	}
	for (const [label, pattern] of PATTERNS) {
		if (pattern.test(text)) hits.push(`${file}: ${label}`);
	}
}

if (hits.length) {
	console.error(`Possible secrets in tracked files:\n  ${hits.join("\n  ")}`);
	process.exit(1);
}
console.log(`scan-secrets: no secrets found in ${files.length} tracked files.`);

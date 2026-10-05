"use strict";
// Fails when bun.lock does not match package.json or would change on install.
const { spawnSync } = require("node:child_process");

const result = spawnSync("bun", ["install", "--frozen-lockfile"], { stdio: "inherit" });
if (result.status !== 0) {
	console.error("verify-lock: bun.lock is out of date or changed unexpectedly.");
	process.exit(result.status ?? 1);
}
console.log("verify-lock: lockfile is consistent with package.json.");

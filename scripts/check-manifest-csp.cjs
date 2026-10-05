"use strict";
// Fails when public/manifest.json lacks a strict extension_pages CSP.
const manifest = require("../public/manifest.json");

const csp = manifest.content_security_policy?.extension_pages;
const problems = [];

if (csp) {
	if (!/(^|;)\s*script-src\s+'self'(\s|;|$)/.test(csp)) problems.push("script-src must be 'self'");
	for (const banned of ["'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", "http:", "*"]) {
		if (csp.includes(banned)) problems.push(`CSP must not contain ${banned}`);
	}
} else problems.push("content_security_policy.extension_pages is missing");

if (problems.length) {
	console.error(`Manifest CSP check failed:\n  ${problems.join("\n  ")}`);
	process.exit(1);
}
console.log(`check-csp: ok (${csp})`);

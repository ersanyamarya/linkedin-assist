# Security policy

## Supported versions

Only the latest release gets security fixes. Upgrade before reporting, if you can.

## Report a vulnerability

Don't open a public issue. Use [GitHub's private vulnerability reporting](https://github.com/ersanyamarya/netwrite/security/advisories/new) instead.

Include:

- The version (from `chrome://extensions`) and your browser version.
- Steps to reproduce, and what an attacker gains.
- A proof of concept, if you have one.

You can expect a reply within 7 days. Once a fix ships, the advisory is published and you're credited unless you'd rather not be.

## What's in scope

- Anything that exposes a saved API token or voice samples: storage, messaging between the content scripts and the background worker, or the options page.
- Page content leaving the browser to anywhere other than the AI provider the user configured.
- Code execution through content scripts or the extension's CSP.

## What's out of scope

- Problems in a third-party AI provider or in LinkedIn itself.
- Attacks that need a user to already have a malicious extension or full access to their browser profile.
- Missing hardening that has no demonstrated impact.

## For maintainers

Run `bun run security` before every release. It checks the lockfile, the manifest CSP, and tracked files for secrets. Details of the last audit are in [README.security-audit.md](README.security-audit.md).

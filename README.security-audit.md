# Security audit

Notes on the security hardening done after audit `run-1`, what is still open, and how to check it.

The audit output lives in `security-audit/run-1/` (gitignored, local only). Start with `REPORT.md`, then `findings.json`. Items in `NEEDS-VALIDATION.md` are leads the scanners could not confirm; check each one by hand before acting on it.

## What changed

| Area | Change | Where |
|------|--------|-------|
| API key at rest | Encrypted with AES-GCM (Web Crypto). The key is non-extractable and stored in the extension's IndexedDB. Keys saved as plain text are re-saved encrypted on the next load. | `src/crypto-key.ts`, `src/lib/ai-settings.ts` |
| Voice samples | Content scripts no longer read `chrome.storage`. They ask the background worker over `voice-load` / `voice-save`. Only extension pages may save. Samples are stored encrypted. | `src/lib/voice-settings.ts`, `src/background/voice-store.ts`, `src/background/service-worker.ts` |
| Base URL | `normalizeBaseUrl` rejects URLs with a username or password. | `src/lib/ai-settings.ts` |
| CSP | Explicit `script-src 'self'; object-src 'self'` for extension pages. | `public/manifest.json` |
| Dependencies | Exact versions only (no `^`, `~` or `latest`); `bun.lock` regenerated. | `package.json`, `bun.lock` |
| Dev credentials | `.mcp.json` reads `${CONTEXT7_API_KEY}` and `${TAVILY_API_KEY}`. Real values go in `.env.local` (gitignored). | `.mcp.json` |
| Build output | `--root .` stops Bun writing to `dist/_.._/`, which broke every path in the manifest. | `package.json` |

## Checklist

Phase 1 and 2:

- [x] Create `src/crypto-key.ts`
- [x] Encrypt the API key at rest
- [x] Remove direct storage access from `voice-settings.ts`
- [x] Pin exact versions in `package.json`
- [x] Reject credentials in `normalizeBaseUrl`
- [x] Add a CSP to `manifest.json`
- [x] `dangerouslyAllowBrowser`: closed as an accepted risk, not removed (see below)
- [x] Lockfile integrity check (`scripts/verify-lock.cjs`)
- [x] Move dev credentials to `.env.local`
- [x] CSP lint rule (`scripts/check-manifest-csp.cjs`)

Phase 3:

- [x] Regression test (`tests/extension-load.test.ts`)
- [x] `security-audit-config.json`
- [x] This README
- [ ] Decouple the remaining storage reads into service-worker RPC (done for voice samples; AI providers are still read by the options page)
- [ ] Tag release `audit-hardened-v1`

## Still open

- **`dangerouslyAllowBrowser` is still set** in `src/lib/ai-client.ts`. The options page calls `listModels` directly, and the OpenAI SDK refuses to run in a page context without the flag. Content scripts never import this file. Removing the flag means moving `listModels` behind a service-worker message.
- **The options page still decrypts the API key.** The goal was "only the background worker decrypts"; that needs the same RPC move.
- **Rotate the old Context7 and Tavily keys.** They are still in git history for `.mcp.json`. Editing the file does not remove them.
- **No unit tests** for `crypto-key`, `normalizeBaseUrl`, or the plain-text-to-encrypted migrations.
- **No CI.** Nothing runs `bun run security` or `bun test` automatically.
- **Not tested in a real browser:** "Load models", the content scripts on LinkedIn, and saving an API key through the encrypted path.

## Run the checks

```bash
bun install
bun run security     # lockfile pinning, lockfile consistency, manifest CSP, secret scan
bun test             # regression test (rebuilds dist/)
bunx tsc --noEmit    # type check
```

`bun run security` runs these four, which you can also run on their own:

| Script | Fails when |
|--------|-----------|
| `bun run validate-lock` | a dependency uses a mutable version, or `bun.lock` doesn't match `package.json` |
| `bun run verify-lock` | `bun install --frozen-lockfile` fails |
| `bun run check-csp` | the manifest has no strict `extension_pages` CSP |
| `bun run scan-secrets` | a tracked file contains something that looks like an API key |

## Run the regression test

```bash
bun test tests/extension-load.test.ts
```

It runs `bun run build` and wipes `dist/`, so close the extension's tab or reload it afterwards. It checks that:

1. the build exits 0 with no errors,
2. `dist/manifest.json` is valid JSON with `name`, `version` and `manifest_version` 3,
3. every file the manifest and `options.html` reference exists in `dist/`,
4. `dist/` has no `_`-prefixed directories such as `_.._`,
5. every `scripts/*.cjs` file named in `package.json` exists.

It does not start a browser and does not check that the API key stays out of network traffic or the console.

To load the extension by hand: `bun run build`, open `chrome://extensions`, turn on Developer mode, click **Load unpacked**, and select `dist/`.

## Run a new audit

```bash
skill_run security-audit --profile standard
```

`security-audit-config.json` holds the intended settings (profile, budget, output directory, checks). Nothing reads it yet, and whether the audit tool accepts a config-file flag is unverified. Each run writes a new `security-audit/run-<N>/` folder.

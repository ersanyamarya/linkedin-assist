# Contributing

Thanks for helping. Bug reports, fixes, and small features are all welcome. For anything bigger than a small change, open an issue first so we can agree on the approach before you write code.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions are licensed under the [MIT license](LICENSE).

## Set up

You need [Bun](https://bun.sh) and Chrome.

```bash
bun install
bun run dev
```

Then load the extension: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick the `dist/` folder. Refresh LinkedIn after each rebuild. `bun run dev` rebuilds on every change.

## Before you open a pull request

```bash
bun run build
bun test
bun run format
bun run security
```

- `bun test` checks the built extension, so run `bun run build` first.
- `bun run format` fixes style with Ultracite (Biome). The repo uses tabs, so keep them.
- `bun run security` checks the lockfile, the manifest CSP, and tracked files for secrets.

## Conventions

- **Selectors live in one place:** add new LinkedIn selectors to `DOM.SELECTORS` in `src/lib/constants.ts`, nowhere else.
- **Idempotent DOM wiring:** guard injected UI with `DOM.ATTR.DATA_MUTATED`, so a re-render never adds a second button.
- **Dependencies are pinned:** use exact versions, with no `^`, `~`, or `latest`. `bun run security` fails otherwise, and `bun.lock` must be committed with any change.
- **Content scripts never see secrets:** the API token and voice samples are read only in the background worker. Don't read `chrome.storage` from a content script.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org): `feat(ui): ...`, `fix(build): ...`, `docs: ...`.

More detail on the code layout is in [CLAUDE.md](CLAUDE.md) and [.github/copilot-instructions.md](.github/copilot-instructions.md).

## LinkedIn pages change

Selectors break when LinkedIn changes its markup. A fix that updates a selector is a great first contribution. In the issue or pull request, say which page type broke (feed, single post, messaging, profile, or job) and include a screenshot with personal details blurred.

## Optional tooling

The repo includes config for AI coding tools (`.claude/`, `.mcp.json`, `.fallowrc.json`). None of it is needed to build or test. `.mcp.json` reads API keys from environment variables such as `TAVILY_API_KEY`. Never put a key in the file.

## Releases

Maintainers cut releases. The steps are in the README under "Releasing".

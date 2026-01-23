# LinkedIn Assist — Copilot instructions

## Architecture & flow

- This is a Chrome MV3 content-script extension; `public/manifest.json` registers `content/index.js` + `styles.css` on `https://www.linkedin.com/*`.
- Entry point `src/content/index.ts` installs a `MutationObserver` and calls `loadedCommentScript` on DOM changes.
- DOM extraction + UI injection live in `src/content/comment.ts`; it marks processed editors with `data-mutated` and adds CSS classes prefixed `linkedin-assist__`.
- Modal UI is in `src/shared/text-modal.ts` (copy-to-clipboard + backdrop close).

## Conventions and patterns

- Keep DOM queries encapsulated in helpers (`findFeedContainer`, `findCommentaryTextElement`) and reuse them when adding new selectors.
- When attaching UI, append to the editor row and add `linkedin-assist__*` classes; update styles in `public/styles.css`.
- Avoid duplicate wiring: respect the `data-mutated` guard and prefer idempotent DOM changes.

## Workflows

- Install deps: `bun install`.
- Dev watch build + copy: `bun run dev` (outputs to `dist/` and mirrors `public/`).
- Build once: `bun run build`; clean: `bun run clean`.

## Integration points

- Runs only as content script on LinkedIn; there’s no background script or popup.
- Output for the modal is JSON from `{ postContent, comments }` (see `handleSuggestionClick`).

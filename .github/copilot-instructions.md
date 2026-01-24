# LinkedIn Assist — Copilot instructions

## Big picture (MV3 content script)

- Chrome MV3 **content-script only** (no background/popup). `public/manifest.json` injects `dist/content/index.js` on `https://www.linkedin.com/*`.
- `src/content/index.ts` registers a single `MutationObserver` on `document.body` and calls `loadedCommentScript()`.
- `src/content/comment.ts` finds new editors (`DOM.SELECTORS.EDITABLE_COMMENT_BOX`), marks them with `data-mutated`, injects a lightbulb button, and on click:
  - Extracts either **post + comments** or **messaging thread** (route `/messaging/thread/` or presence of `.msg-thread`).
  - Validates payloads via Zod (`src/lib/schemas.ts`), builds a plain-text prompt (`src/lib/prompt-builders.ts`), and shows it in a modal (`src/ui/text-modal.ts`).

## Project-specific conventions

- **Selectors live in one place**: extend `src/lib/constants.ts` (`DOM.SELECTORS`) and update helpers; avoid ad-hoc selectors scattered in logic.
- **Idempotent DOM wiring**: always gate on `DOM.ATTR.DATA_MUTATED` to avoid duplicate buttons on repeated mutations.
- **Messaging sender extraction pitfall**: don’t use broad `a[href*='/in/']` (it matches `@mentions` in message paragraphs). Prefer `.msg-s-message-group__meta a[href*='/in/']` and keep fallbacks mention-safe (see `extractMessageSenderNameRaw()` in `src/content/comment.ts`).
- **UI styling**: extension classes use `linkedin-assist__*` and are styled in `public/styles.css`; keep inline styles minimal.

## Developer workflows

- `bun install`
- `bun run dev` (watch build + copy assets to `dist/`)
- `bun run build` (clean + compile + copy to `dist/`)
- Load unpacked: `chrome://extensions` → Developer mode → **Load unpacked** → select `dist/`

## Formatting/linting

- Use Ultracite/Biome: `bun run format`.
- Preserve existing formatting (Biome prefers tabs in this repo); avoid drive-by reformatting.

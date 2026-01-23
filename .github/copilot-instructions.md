# LinkedIn Assist — Copilot instructions

## Architecture & flow

**Extension type**: Chrome MV3 content-script only (no background script, no popup).

**Entry → DOM observation → DOM extraction → UI injection → Modal:**

1. `src/content/index.ts`: Single `MutationObserver` watches `document.body` for new comment editors
2. Calls `loadedCommentScript()` from `src/content/comment.ts` on every mutation
3. Finds unprocessed editors (marked via `data-mutated` attribute), highlights them with random light color
4. Attaches suggestion button to the editor row; clicking triggers DOM extraction and `createTextModal()`
5. `src/shared/text-modal.ts` renders modal with copy + close buttons; backdrop click closes

**DOM structure**: LinkedIn uses both feed list (`[data-view-name="feed-full-update"]`) and single post page layouts. Helpers (`findFeedContainer`, `findCommentaryTextElement`, `extractPostComments`) try multiple selectors to work in both contexts.

## Conventions and patterns

- **DOM selectors**: Centralized in `src/shared/constants.ts` (`DOM.SELECTORS`); reuse in helpers rather than inline queries.
  - Example: `findFeedContainer()` tries feed list selector → listitem role → single post fallback.
  - When adding new selectors, extend `DOM.SELECTORS` and update relevant helpers.
- **UI attachment**: Append to editor row, use `linkedin-assist__*` class prefix, style in `public/styles.css` (not inline, except `randomLightHexColor()` for highlights).
- **Idempotent DOM changes**: Always check `data-mutated` attribute before processing to avoid duplicate wiring on repeat mutations.
- **Shared exports**: All constants, UI strings, SVG icons live in `src/shared/constants.ts` and re-export via `src/shared/index.ts`.

## Workflows

- **Setup**: `bun install`
- **Dev** (watch + auto-rebuild): `bun run dev` → watches `src/**` + `public/**`, outputs to `dist/`, mirrors assets
- **One-time build**: `bun run build` (clean + copy + compile)
- **Clean**: `bun run clean`
- **Load extension**: `chrome://extensions/` → Developer mode → Load unpacked → select `dist/` folder

## Key files & their roles

| File                       | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `src/content/index.ts`     | Registers mutation observer; entry point                                |
| `src/content/comment.ts`   | Finds + highlights editors, attaches button, extracts post/comment text |
| `src/shared/constants.ts`  | DOM selectors, UI classes, SVG icons, theme constants                   |
| `src/shared/text-modal.ts` | Modal component with copy & close buttons                               |
| `public/manifest.json`     | Content script registration; runs on `https://www.linkedin.com/*`       |
| `public/styles.css`        | Modal + button styling                                                  |

## Integration points & constraints

- **No external APIs** (yet); pure DOM extraction.
- **No background script or popup**; content script does all work.
- **Bun + TypeScript 5** only; strict build process.
- **Modal output**: Plain text (post + comments concatenated) to `navigator.clipboard`.

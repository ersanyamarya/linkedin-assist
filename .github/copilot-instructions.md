# LinkedIn Assist — Copilot instructions

## Big picture (MV3 content script)

- Chrome MV3 **content-script only** (no background/popup). `public/manifest.json` injects `content/index.js` from `dist/` on `https://www.linkedin.com/*`.
- `src/content/index.ts` registers one `MutationObserver` on `document.body` and calls `loadedCommentScript()`.
- `src/content/comment.ts` locates new editors (`DOM.SELECTORS.EDITABLE_COMMENT_BOX`), marks them with `DOM.ATTR.DATA_MUTATED`, injects the lightbulb button, and on click:
  - Branches to **messaging thread** (route `/messaging/thread/` or `.msg-thread`) vs **post + comments**.
  - Validates extraction via Zod schemas (`src/lib/schemas.ts`).
  - Messaging: opens `createMessageReplyModal()` (`src/ui/message-reply-modal.ts`), builds a prompt with `buildMessagesPrompt()` (`src/prompt/messages.ts`), then shows `createTextModal()` (`src/ui/text-modal.ts`).
  - Post comments: opens `createPostCommentPromptModal()` (`src/ui/post-prompt-modal.ts`) to gather options, then builds the LLM prompt via `buildLinkedInCommentPrompt()` (`src/prompt/post-comment.ts`) which composes `SYSTEM_INSTRUCTIONS` (`src/prompt/system-instructions.ts`).

## Project-specific conventions

- **Selectors live in one place**: extend `src/lib/constants.ts` (`DOM.SELECTORS`) and update helpers; avoid ad-hoc selectors scattered in logic.
- **Idempotent DOM wiring**: always gate on `DOM.ATTR.DATA_MUTATED` to avoid duplicate buttons on repeated mutations.
- **Messaging sender extraction pitfall**: don’t use broad `a[href*='/in/']` (it matches `@mentions` in message paragraphs). Prefer `DOM.SELECTORS.MESSAGING_SENDER_NAME` and keep fallbacks mention-safe (see `extractMessageSenderNameRaw()` in `src/content/comment.ts`).
- **UI styling**: extension classes use `linkedin-assist__*` and are styled in `public/styles.css`; keep inline styles minimal.
- **Prompt text utilities**: keep prompt formatting helpers in `src/prompt/prompt-utils.ts` and reuse `joinSections()`/`asFencedBlock()` for consistent output.

## Developer workflows

- `bun install`
- `bun run dev` (watch build + copy assets to `dist/`)
- `bun run build` (clean + compile + copy to `dist/`)
- Load unpacked: `chrome://extensions` → Developer mode → **Load unpacked** → select `dist/`

## Formatting/linting

- Use Ultracite/Biome: `bun run format`.
- Preserve existing formatting (Biome prefers tabs in this repo); avoid drive-by reformatting.

# LinkedIn Assist — Copilot instructions

## Big picture (MV3 content script)

- Chrome MV3 **content-script only** (no background/popup). `public/manifest.json` injects `content/index.js` from `dist/` on `https://www.linkedin.com/*`.
- `src/content/index.ts` registers a single `MutationObserver` on `document.body` and calls `loadedCommentScript()` on each mutation.
- `src/content/comment.ts` discovers editors via `DOM.SELECTORS.EDITABLE_COMMENT_BOX`, marks them with `DOM.ATTR.DATA_MUTATED`, and injects a lightbulb button.
- Click flow branches by page type:
  - **Messaging threads** (`/messaging/thread/` or `.msg-thread`): extract sender + last 3 messages, validate with `MessagesSchema`, open `createMessageReplyModal()` → `buildMessagesPrompt()` → `createTextModal()`.
  - **Post comments**: extract post + comments, validate with `PostCommentsSchema`, open `createPostCommentPromptModal()` → `buildLinkedInCommentPrompt()` → `createTextModal()`.

## Project-specific conventions

- **Selectors live in one place**: extend `src/lib/constants.ts` (`DOM.SELECTORS`) and update helpers; avoid ad-hoc selectors in logic.
- **Idempotent DOM wiring**: always gate on `DOM.ATTR.DATA_MUTATED` to avoid duplicate buttons on repeated mutations.
- **Messaging sender extraction pitfall**: don’t use broad `a[href*='/in/']` (it matches `@mentions` in message paragraphs). Prefer `DOM.SELECTORS.MESSAGING_SENDER_NAME` and keep fallbacks mention-safe (see `extractMessageSenderNameRaw()` in `src/content/comment.ts`).
- **Prompt formatting**: reuse `joinSections()`/`asFencedBlock()` from `src/prompt/prompt-utils.ts` to keep output consistent; both `post-comment.ts` and `messages.ts` follow this pattern.
- **UI styling**: extension classes use `linkedin-assist__*` and are styled in `public/styles.css`; keep inline styles minimal and prefer `src/ui/components/*` helpers when adding modals.
- **Messaging presets**: reply presets are defined in `src/ui/message-reply-modal.ts` and applied via `applyMessageTemplate()`; the preset panel toggles in `comment.ts` for thread pages.

## Developer workflows

- `bun install`
- `bun run dev` (watch build + copy assets to `dist/`)
- `bun run build` (clean + compile + copy to `dist/`)
- Load unpacked: `chrome://extensions` → Developer mode → **Load unpacked** → select `dist/`

## Formatting/linting

- Use Ultracite/Biome: `bun run format`.
- Preserve existing formatting (Biome prefers tabs in this repo); avoid drive-by reformatting.

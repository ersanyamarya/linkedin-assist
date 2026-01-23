# LinkedIn Assist

A Chrome extension that adds a suggestion button to LinkedIn comment editors and
captures the post text + existing comments into a copyable modal.

## Features

- Injects a suggestion button next to each LinkedIn comment editor
- Extracts post content and visible comment text from the feed item
- Displays extracted data in a modal with a copy-to-clipboard button
- Highlights comment editors for quick visual confirmation

## Setup

Install dependencies:

```bash
bun install
```

## Development

Build and watch for changes (rebuilds `dist/` and copies `public/` assets):

```bash
bun run dev
```

Build once:

```bash
bun run build
```

Clean build artifacts:

```bash
bun run clean
```

## Load the Extension

1. Build the extension: `bun run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `dist/` folder

## Usage

1. Open LinkedIn and navigate to the feed.
2. Click into a comment editor and use the lightbulb button.
3. Copy the extracted post content + comments from the modal.

## Notes

- The content script runs on `https://www.linkedin.com/*`.
- Assets come from `public/`, and the content script source is in `src/content/`.

---

Built with [Bun](https://bun.com).

# Changelog

Each release's notes are the section for its version. The release workflow copies that section into the GitHub release, so write it before you tag.

## [0.2.0] - 2026-10-06

### Added

- Optional AI generation: connect one or more OpenAI-compatible APIs (including local servers) and generate replies inside LinkedIn. Switch providers from the prompt window.
- Voice profile: add writing samples on the options page and every prompt uses them.
- Connection notes from a profile, with the 200 or 300 character limit built in.
- Reply to a specific comment, with reply-specific wording.
- Refine and check: rewrite chips under a generated answer, a local check for filler wording, and length warnings.
- Profile summary, repost with your thoughts, and quick replies in messages.
- Job description extraction on LinkedIn job pages.
- Toolbar and store icons.

### Changed

- Redesigned prompt windows with steps for inputs, prompt, and answer.
- Notices replace browser alerts.

### Security

- API tokens and voice samples are stored encrypted, and only the background worker reads them. Content scripts never see the token.
- Stricter extension page CSP and dependency lockfile checks.

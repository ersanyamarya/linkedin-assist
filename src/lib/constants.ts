/* Domain-organized constants
 * - DOM: selectors and attribute keys
 * - UI: classes, svg and text labels
 * - THEME: theme-related constants
 */

export const DOM = {
	SELECTORS: {
		EDITABLE_COMMENT_BOX: 'div[contenteditable="true"][role="textbox"]',
		FEED_FULL_UPDATE: '[data-view-name="feed-full-update"]',
		ROLE_LISTITEM: '[role="listitem"]',
		FEED_COMMENTARY: '[data-view-name="feed-commentary"]',
		EXPANDABLE_TEXT_BOX: '[data-testid="expandable-text-box"]',
		COMMENT_COMMENTARY: '[data-view-name="comment-commentary"], [data-view-name="comment-reply-commentary"]',
		// LinkedIn sometimes serves a feed variant with no `data-view-name` attributes at all (no FEED_COMMENTARY,
		// no COMMENT_COMMENTARY). In that variant, `data-testid="expandable-text-box"` is still present on every
		// text block (post + comments), and this test-id substring marks the comment list wrapper so we can tell
		// which expandable-text-box elements are comments vs. the post itself.
		POST_COMMENT_LIST: '[data-testid*="commentList"]',
		// Single post page selectors
		POST_COMMENTARY: ".update-components-text.update-components-update-v2__commentary",
		POST_ARTICLE_CONTAINER: "article.update-components-article",
		SINGLE_POST_COMMENT: "article.comments-comment-entity",
		SINGLE_POST_COMMENT_CONTENT: ".comments-comment-entity__content",
		// LinkedIn's social counts row (reactions / comments / reposts, shown just above the
		// Like/Comment/Repost/Send action bar) is rendered with fully hashed, build-specific class
		// names and no aria-label or data-* hooks at all, so it can't be targeted with a CSS
		// selector. It's located structurally instead — see `REACTION_COUNT_TEXT_PATTERN` in
		// editableTextArea.ts, which matches the reaction-count text itself (e.g. "376 reactions").
		// Messaging thread selectors
		MESSAGING_THREAD_CONTAINER: ".msg-thread",
		MESSAGING_THREAD_PARTNER_NAME: ".msg-thread__link-to-profile h2",
		MESSAGING_MESSAGE_LIST: "ul.msg-s-message-list-content",
		MESSAGING_MESSAGE_EVENT: "li.msg-s-message-list__event",
		// Prefer the message meta/header area to avoid matching profile links inside message body (@mentions).
		MESSAGING_SENDER_NAME: ".msg-s-message-group__meta a[href*='/in/']",
		// Job details page selectors
		// LinkedIn periodically hashes CSS class names; we keep ordered lists from most- to least-specific.
		JOB_SAVE_BUTTON: '[data-view-name="job-save-button"]',
		JOB_SAVE_BUTTON_FALLBACKS: ['[data-view-name="job-save-button"]', 'button[aria-label*="Save job"]', 'button[aria-label*="Save"]', ".jobs-save-button"],
		JOB_TOP_CARD: ".job-details-jobs-unified-top-card",
		JOB_TITLE_SELECTORS: [".job-details-jobs-unified-top-card__job-title h1", ".jobs-unified-top-card__job-title h1", "h1.t-24", "h1"],
		JOB_COMPANY_NAME_SELECTORS: [
			".job-details-jobs-unified-top-card__company-name a",
			".jobs-unified-top-card__company-name a",
			"a.ember-view[href*='/company/']",
			"a[href*='/company/'][data-tracking-control-name]",
			"a[href*='/company/']",
		],
		JOB_PRIMARY_DESCRIPTION_SELECTORS: [
			".job-details-jobs-unified-top-card__primary-description-container",
			".jobs-unified-top-card__primary-description-without-tagline",
			".jobs-unified-top-card__primary-description",
		],
		JOB_PREFERENCES: ".job-details-fit-level-preferences button",
		JOB_DESCRIPTION_BODY_SELECTORS: [
			"#job-details",
			".jobs-description__content",
			".jobs-description-content__text",
			".jobs-description-content__text--stretch",
			".description__text",
			".show-more-less-html__markup",
		],
		// Keep these for backwards compatibility
		JOB_TITLE: ".job-details-jobs-unified-top-card__job-title h1",
		JOB_COMPANY_NAME: ".job-details-jobs-unified-top-card__company-name a",
		JOB_PRIMARY_DESCRIPTION: ".job-details-jobs-unified-top-card__primary-description-container",
		JOB_DESCRIPTION_BODY: "#job-details",
		JOB_DESCRIPTION_BODY_FALLBACK: ".jobs-description-content__text--stretch",
		// Profile page selectors. The profile ships fully hashed class names and no ids or data-view-name
		// hooks, so sections are found by their <h2> text and the name comes from the document title.
		PROFILE_SECTION: "main section",
		PROFILE_SECTION_HEADING: "h2",
		// The profile scrolls inside <main>, not the window; lower sections only render once scrolled into view.
		PROFILE_SCROLL_CONTAINER: "main#workspace",
		PROFILE_ACTIONS_SELECTORS: [".pvs-profile-actions", ".pv-top-card-v2-ctas"],
		// Structural fallback when the action row's classes are hashed: its buttons keep stable aria-labels.
		PROFILE_ACTION_BUTTON_FALLBACKS: [
			'main a[href*="/messaging/compose"]',
			'main button[aria-label^="Message"]',
			'main button[aria-label*="to connect"]',
			'main button[aria-label^="Follow"]',
			'main button[aria-label="More actions"]',
		],
	},

	ATTR: {
		DATA_MUTATED: "data-mutated",
		DATA_JOB_IDEA: "data-la-job-idea",
		DATA_REPOST_IDEA: "data-la-repost-idea",
		DATA_PROFILE_IDEA: "data-la-profile-idea",
	},
};

export const UI = {
	CLASSES: {
		BUTTON_DEFAULTS: ["artdeco-button", "artdeco-button--muted", "artdeco-button--tertiary", "artdeco-button--circle"],
		IDEA_BUTTON: "linkedin-assist__idea-button",
		QUICK_ACTIONS: "linkedin-assist__quick-actions",
		PRESET_PANEL: "linkedin-assist__preset-panel",
		PRESET_ITEM: "linkedin-assist__preset-item",
		PRESET_ITEM_ADVANCED: "linkedin-assist__preset-item--advanced",
		COMMENT_ROW: "linkedin-assist__comment-row",
		COMMENT_EDITOR: "linkedin-assist__comment-editor",
		COMMENTARY_TEXT: "linkedin-assist__commentary-text",
	},

	SVG: {
		// Outline weight and proportions match LinkedIn's own toolbar icons (emoji, GIF, photo)
		// so the button reads as part of their UI instead of a foreign glyph.
		IDEA: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.3h6c0-1.1.4-1.8 1-2.3A7 7 0 0 0 12 2Z"/></svg>',
		CLOSE:
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
	},

	TEXT: {
		COPY_BUTTON: "Copy",
		COPIED_TEXT: "Copied!",
		CLOSE_BUTTON: "Close",
		GENERATE_BUTTON: "Generate prompt",
		CANCEL_BUTTON: "Cancel",
		REPOST_IDEA_BUTTON: "Draft a repost with your thoughts",
		PROFILE_IDEA_BUTTON: "Generate a brief profile of this person",
	},
};

export const THEME = {
	LIGHT_HEX_LETTERS: "BCDEF".split("") as string[],
};

// Backwards-compatible aliases (temporarily) to reduce churn in imports.
export const SELECTORS = DOM.SELECTORS;
export const ATTR = DOM.ATTR;
export const CLASS_NAMES = UI.CLASSES;
export const UI_SVG = UI.SVG;
export const TEXT = UI.TEXT;
export const LIGHT_HEX_LETTERS = THEME.LIGHT_HEX_LETTERS;

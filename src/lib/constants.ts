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
		// Single post page selectors
		POST_COMMENTARY: ".update-components-text.update-components-update-v2__commentary",
		POST_ARTICLE_CONTAINER: "article.update-components-article",
		SINGLE_POST_COMMENT: "article.comments-comment-entity",
		SINGLE_POST_COMMENT_CONTENT: ".comments-comment-entity__content",
		// Messaging thread selectors
		MESSAGING_THREAD_CONTAINER: ".msg-thread",
		MESSAGING_THREAD_PARTNER_NAME: ".msg-thread__link-to-profile h2",
		MESSAGING_MESSAGE_LIST: "ul.msg-s-message-list-content",
		MESSAGING_MESSAGE_EVENT: "li.msg-s-message-list__event",
		// Prefer the message meta/header area to avoid matching profile links inside message body (@mentions).
		MESSAGING_SENDER_NAME: ".msg-s-message-group__meta a[href*='/in/']",
		// Job details page selectors
		JOB_SAVE_BUTTON: ".jobs-save-button",
		JOB_TOP_CARD: ".job-details-jobs-unified-top-card",
		JOB_TITLE: ".job-details-jobs-unified-top-card__job-title h1",
		JOB_COMPANY_NAME: ".job-details-jobs-unified-top-card__company-name a",
		JOB_PRIMARY_DESCRIPTION: ".job-details-jobs-unified-top-card__primary-description-container",
		JOB_PREFERENCES: ".job-details-fit-level-preferences button",
		JOB_DESCRIPTION_BODY: "#job-details",
		JOB_DESCRIPTION_BODY_FALLBACK: ".jobs-description-content__text--stretch",
	},

	ATTR: {
		DATA_MUTATED: "data-mutated",
		DATA_JOB_IDEA: "data-la-job-idea",
	},
};

export const UI = {
	CLASSES: {
		BUTTON_DEFAULTS: ["artdeco-button", "artdeco-button--muted", "artdeco-button--tertiary", "artdeco-button--circle"],
		SUGGESTION_BUTTON: "linkedin-assist__suggestion-button",
		QUICK_ACTIONS: "linkedin-assist__quick-actions",
		PRESET_PANEL: "linkedin-assist__preset-panel",
		PRESET_ITEM: "linkedin-assist__preset-item",
		PRESET_ITEM_ADVANCED: "linkedin-assist__preset-item--advanced",
		COMMENT_ROW: "linkedin-assist__comment-row",
		COMMENT_EDITOR: "linkedin-assist__comment-editor",
		COMMENTARY_TEXT: "linkedin-assist__commentary-text",
	},

	SVG: {
		SUGGESTION:
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lightbulb-fill" viewBox="0 0 16 16"><path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5"/></svg>',
	},

	TEXT: {
		COPY_BUTTON: "Copy",
		COPIED_TEXT: "Copied!",
		CLOSE_BUTTON: "Close",
		GENERATE_BUTTON: "Generate prompt",
		CANCEL_BUTTON: "Cancel",
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

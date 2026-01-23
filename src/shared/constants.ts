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
    COMMENT_COMMENTARY:
      '[data-view-name="comment-commentary"], [data-view-name="comment-reply-commentary"]',
    // Single post page selectors
    POST_COMMENTARY:
      ".update-components-text.update-components-update-v2__commentary",
    POST_ARTICLE_CONTAINER: "article.update-components-article",
    SINGLE_POST_COMMENT: "article.comments-comment-entity",
    SINGLE_POST_COMMENT_CONTENT: ".comments-comment-entity__content",
  },

  ATTR: {
    DATA_MUTATED: "data-mutated",
  },
};

export const UI = {
  CLASSES: {
    BUTTON_DEFAULTS: [
      "artdeco-button",
      "artdeco-button--muted",
      "artdeco-button--tertiary",
      "artdeco-button--circle",
    ],
    SUGGESTION_BUTTON: "linkedin-assist__suggestion-button",
    COMMENT_ROW: "linkedin-assist__comment-row",
    COMMENT_EDITOR: "linkedin-assist__comment-editor",
    COMMENTARY_TEXT: "linkedin-assist__commentary-text",
    MODAL_BACKDROP: "linkedin-assist__modal-backdrop",
    MODAL: "linkedin-assist__modal",
    MODAL_CONTENT: "linkedin-assist__modal-content",
    MODAL_BUTTONS: "linkedin-assist__modal-buttons",
    MODAL_BUTTON: "linkedin-assist__modal-button",
    MODAL_BUTTON_PRIMARY: "linkedin-assist__modal-button--primary",
    MODAL_BUTTON_SECONDARY: "linkedin-assist__modal-button--secondary",
  },

  SVG: {
    SUGGESTION:
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lightbulb-fill" viewBox="0 0 16 16"><path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5"/></svg>',
  },

  TEXT: {
    COPY_BUTTON: "Copy",
    COPIED_TEXT: "Copied!",
    CLOSE_BUTTON: "Close",
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

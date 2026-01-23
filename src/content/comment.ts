import { createTextModal, DOM, UI, THEME } from "../shared";

const randomLightHexColor = (): string => {
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color +=
      THEME.LIGHT_HEX_LETTERS[
        Math.floor(Math.random() * THEME.LIGHT_HEX_LETTERS.length)
      ];
  }
  return color;
};

export const loadedCommentScript = () => {
  Array.from(document.querySelectorAll(DOM.SELECTORS.EDITABLE_COMMENT_BOX))
    .filter((commentBox) => !commentBox.hasAttribute(DOM.ATTR.DATA_MUTATED))
    .forEach((commentBox) => {
      commentBox.setAttribute(DOM.ATTR.DATA_MUTATED, "true");
      (commentBox as HTMLElement).style.backgroundColor = randomLightHexColor();
      addSuggestionButton(commentBox);
    });
};

/**
 * Finds the feed container that owns the editor.
 * Works on both feed list and single post pages.
 */
const findFeedContainer = (commentBox: Element): Element | null => {
  // Try feed list selectors first
  let container =
    commentBox.closest(DOM.SELECTORS.FEED_FULL_UPDATE) ??
    commentBox.closest(DOM.SELECTORS.ROLE_LISTITEM);

  // If not found, try single post page structure
  if (!container) {
    container = document.querySelector(
      'div[class*="feed-shared-update-v2__control-menu-container"]',
    );
  }

  return container;
};

/**
 * Finds the commentary text element for the feed item containing the editor.
 * Works on both feed list and single post pages.
 */
const findCommentaryTextElement = (commentBox: Element): Element | null => {
  const container = findFeedContainer(commentBox);
  if (!container) return null;

  // Try feed list selector first
  let commentary = container.querySelector(DOM.SELECTORS.FEED_COMMENTARY);
  if (commentary) {
    return (
      commentary.querySelector(DOM.SELECTORS.EXPANDABLE_TEXT_BOX) ?? commentary
    );
  }

  // Try single post page selector
  const postCommentary = container.querySelector(DOM.SELECTORS.POST_COMMENTARY);
  if (postCommentary) return postCommentary;

  return null;
};

/**
 * Extracts text from a comment commentary element.
 */
const extractCommentaryText = (commentary: Element): string => {
  const textElement =
    commentary.querySelector(DOM.SELECTORS.EXPANDABLE_TEXT_BOX) ?? commentary;
  return (textElement.textContent ?? "").trim();
};

/**
 * Extracts comment text from the comment list within the same feed item.
 * Works on both feed list and single post pages.
 */
const extractPostComments = (commentBox: Element): string[] => {
  const container = findFeedContainer(commentBox);
  if (!container) return [];

  // Try feed list selectors first
  let commentaries = Array.from(
    container.querySelectorAll(DOM.SELECTORS.COMMENT_COMMENTARY),
  );

  if (commentaries.length > 0) {
    return commentaries
      .map(extractCommentaryText)
      .filter((comment) => comment.length > 0);
  }

  // Try single post page selectors
  const singlePostComments = Array.from(
    document.querySelectorAll(DOM.SELECTORS.SINGLE_POST_COMMENT),
  );

  return singlePostComments
    .map((article) => {
      const contentDiv = article.querySelector(
        DOM.SELECTORS.SINGLE_POST_COMMENT_CONTENT,
      );
      return contentDiv?.textContent?.trim() ?? "";
    })
    .filter((comment) => comment.length > 0);
};

/**
 * Extracts the feed post content and comment array.
 */
const extractPostDetails = (
  commentBox: Element,
): { postContent: string; comments: string[] } => {
  const postContent = extractPostContent(commentBox);
  const comments = extractPostComments(commentBox);
  return { postContent, comments };
};

/**
 * Builds the suggestion button element.
 */
const createSuggestionButton = (onClick: () => void): HTMLButtonElement => {
  const button = document.createElement("button");
  button.classList.add(
    ...UI.CLASSES.BUTTON_DEFAULTS,
    UI.CLASSES.SUGGESTION_BUTTON,
  );
  button.type = "button";
  button.innerHTML = UI.SVG.SUGGESTION;
  button.addEventListener("click", onClick);
  return button;
};

/**
 * Adds comment-row styling and button to the editor row.
 */
const attachButtonToCommentRow = (
  commentBox: Element,
  button: HTMLButtonElement,
) => {
  const parent = commentBox.parentElement;
  parent?.appendChild(button);
  if (parent) {
    parent.classList.add(UI.CLASSES.COMMENT_ROW);
  }
  (commentBox as HTMLElement).classList.add(UI.CLASSES.COMMENT_EDITOR);
};

/**
 * Tags the feed commentary text element for styling.
 */
const markCommentaryText = (commentBox: Element) => {
  const commentaryTextElement = findCommentaryTextElement(commentBox);
  if (!commentaryTextElement) {
    return;
  }

  commentaryTextElement.classList.add(UI.CLASSES.COMMENTARY_TEXT);
};

/**
 * Handles suggestion button clicks for a comment editor.
 */
const handleSuggestionClick = (commentBox: Element) => {
  const { postContent, comments } = extractPostDetails(commentBox);
  if (!postContent) {
    alert("Could not extract post content.");
    return;
  }

  console.log("LinkedIn Assist extracted:", { postContent, comments });
  createTextModal(JSON.stringify({ postContent, comments }, null, 2));
};

/**
 * Adds a suggestion button next to the comment editor.
 */
const addSuggestionButton = (commentBox: Element) => {
  const button = createSuggestionButton(() =>
    handleSuggestionClick(commentBox),
  );
  attachButtonToCommentRow(commentBox, button);
  markCommentaryText(commentBox);
};

/**
 * Extracts the feed post text from the commentary section.
 * Handles both feed list and single post page structures.
 */
const extractPostContent = (commentBox: Element): string => {
  const commentaryTextElement = findCommentaryTextElement(commentBox);
  if (!commentaryTextElement) return "";

  // For single post page, get text from the commentary div directly
  if (
    commentaryTextElement.classList.contains(
      "update-components-update-v2__commentary",
    )
  ) {
    const postText = commentaryTextElement.textContent ?? "";
    return postText.trim();
  }

  // For feed list, extract from expandable text or commentary
  const postText = commentaryTextElement.textContent ?? "";
  return postText.trim();
};

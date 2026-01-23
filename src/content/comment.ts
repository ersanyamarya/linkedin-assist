import { createTextModal } from "../shared";

const randomLightHexColor = (): string => {
  const letters = "BCDEF".split("");
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
};

export const loadedCommentScript = () => {
  Array.from(
    document.querySelectorAll('div[contenteditable="true"][role="textbox"]'),
  )
    .filter((commentBox) => !commentBox.hasAttribute("data-mutated"))
    .forEach((commentBox) => {
      commentBox.setAttribute("data-mutated", "true");
      (commentBox as HTMLElement).style.backgroundColor = randomLightHexColor();
      addSuggestionButton(commentBox);
    });
};

/**
 * Finds the feed container that owns the editor.
 */
const findFeedContainer = (commentBox: Element): Element | null =>
  commentBox.closest('[data-view-name="feed-full-update"]') ??
  commentBox.closest('[role="listitem"]');

/**
 * Finds the commentary text element for the feed item containing the editor.
 */
const findCommentaryTextElement = (commentBox: Element): Element | null => {
  const container = findFeedContainer(commentBox);
  if (!container) return null;

  const commentary = container.querySelector(
    '[data-view-name="feed-commentary"]',
  );
  if (!commentary) return null;

  return (
    commentary.querySelector('[data-testid="expandable-text-box"]') ??
    commentary
  );
};

/**
 * Extracts text from a comment commentary element.
 */
const extractCommentaryText = (commentary: Element): string => {
  const textElement =
    commentary.querySelector('[data-testid="expandable-text-box"]') ??
    commentary;
  return (textElement.textContent ?? "").trim();
};

/**
 * Extracts comment text from the comment list within the same feed item.
 */
const extractPostComments = (commentBox: Element): string[] => {
  const container = findFeedContainer(commentBox);
  if (!container) return [];

  const commentaries = Array.from(
    container.querySelectorAll(
      '[data-view-name="comment-commentary"], [data-view-name="comment-reply-commentary"]',
    ),
  );

  return commentaries
    .map(extractCommentaryText)
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
    "artdeco-button",
    "artdeco-button--muted",
    "artdeco-button--tertiary",
    "artdeco-button--circle",
    "linkedin-assist__suggestion-button",
  );
  button.type = "button";
  button.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lightbulb-fill" viewBox="0 0 16 16"><path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5"/></svg>';
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
    parent.classList.add("linkedin-assist__comment-row");
  }
  (commentBox as HTMLElement).classList.add("linkedin-assist__comment-editor");
};

/**
 * Tags the feed commentary text element for styling.
 */
const markCommentaryText = (commentBox: Element) => {
  const commentaryTextElement = findCommentaryTextElement(commentBox);
  if (!commentaryTextElement) {
    return;
  }

  commentaryTextElement.classList.add("linkedin-assist__commentary-text");
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
 */
const extractPostContent = (commentBox: Element): string => {
  const commentaryTextElement = findCommentaryTextElement(commentBox);
  if (!commentaryTextElement) return "";
  const postText = commentaryTextElement.textContent ?? "";
  return postText.trim();
};

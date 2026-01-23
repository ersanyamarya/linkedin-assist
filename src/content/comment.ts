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
  let container =
    commentBox.closest(DOM.SELECTORS.FEED_FULL_UPDATE) ??
    commentBox.closest(DOM.SELECTORS.ROLE_LISTITEM);

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

  let commentary = container.querySelector(DOM.SELECTORS.FEED_COMMENTARY);
  if (commentary) {
    return (
      commentary.querySelector(DOM.SELECTORS.EXPANDABLE_TEXT_BOX) ?? commentary
    );
  }

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

  let commentaries = Array.from(
    container.querySelectorAll(DOM.SELECTORS.COMMENT_COMMENTARY),
  );

  if (commentaries.length > 0) {
    return commentaries
      .map(extractCommentaryText)
      .filter((comment) => comment.length > 0);
  }

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
 * Extracts the feed post text from the commentary section.
 * Handles both feed list and single post page structures.
 */
const extractPostContent = (commentBox: Element): string => {
  const commentaryTextElement = findCommentaryTextElement(commentBox);
  if (!commentaryTextElement) return "";

  if (
    commentaryTextElement.classList.contains(
      "update-components-update-v2__commentary",
    )
  ) {
    const postText = commentaryTextElement.textContent ?? "";
    return postText.trim();
  }

  const postText = commentaryTextElement.textContent ?? "";
  return postText.trim();
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

const normalizeWhitespace = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

const isOnMessagingThreadRoute = (): boolean =>
  window.location.pathname.startsWith("/messaging/thread/");

/**
 * Checks if the current page is a messaging thread.
 */
const isMessagingThread = (): boolean => {
  if (isOnMessagingThreadRoute()) return true;
  return (
    document.querySelector(DOM.SELECTORS.MESSAGING_THREAD_CONTAINER) !== null
  );
};

/**
 * Extracts the sender name from a messaging thread.
 * Returns the name of the other participant.
 */
const extractSenderName = (): string => {
  const threadContainer = document.querySelector(
    DOM.SELECTORS.MESSAGING_THREAD_CONTAINER,
  );
  if (!threadContainer) return "";

  const partnerHeading = threadContainer.querySelector(
    DOM.SELECTORS.MESSAGING_THREAD_PARTNER_NAME,
  );
  const partnerName = normalizeWhitespace(partnerHeading?.textContent);
  if (partnerName) return partnerName;

  const fallbackHeading = threadContainer.querySelector("h2");
  return normalizeWhitespace(fallbackHeading?.textContent);
};

const extractMessageSenderNameRaw = (messageEvent: Element): string => {
  const senderLinks = Array.from(
    messageEvent.querySelectorAll(DOM.SELECTORS.MESSAGING_SENDER_NAME),
  );

  const candidates = senderLinks
    .map((a) => normalizeWhitespace(a.textContent).replace(/^@/, ""))
    .filter((text) => text.length > 0)
    .filter((text) => !text.toLowerCase().startsWith("view "));

  const last =
    candidates.length > 0 ? candidates[candidates.length - 1] : undefined;
  return last ?? "Unknown";
};

const normalizeNameForCompare = (value: string): string =>
  normalizeWhitespace(value).toLowerCase();

const getMessagingThreadElements = (): {
  readonly threadContainer: Element;
  readonly messageEvents: ReadonlyArray<Element>;
} | null => {
  const threadContainer = document.querySelector(
    DOM.SELECTORS.MESSAGING_THREAD_CONTAINER,
  );
  if (!threadContainer) return null;

  const messageList = threadContainer.querySelector(
    DOM.SELECTORS.MESSAGING_MESSAGE_LIST,
  );
  if (!messageList) return null;

  const messageEvents = Array.from(
    messageList.querySelectorAll(DOM.SELECTORS.MESSAGING_MESSAGE_EVENT),
  );

  return { threadContainer, messageEvents };
};

const inferViewerName = (args: {
  readonly partnerName: string;
  readonly messageEvents: ReadonlyArray<Element>;
}): string => {
  const partnerKey = normalizeNameForCompare(args.partnerName);

  const counts = args.messageEvents
    .map(extractMessageSenderNameRaw)
    .map((name) => normalizeWhitespace(name))
    .filter((name) => name.length > 0 && name !== "Unknown")
    .filter((name) => normalizeNameForCompare(name) !== partnerKey)
    .reduce<Record<string, { name: string; count: number }>>((acc, name) => {
      const key = normalizeNameForCompare(name);
      const existing = acc[key];
      return {
        ...acc,
        [key]: { name, count: (existing?.count ?? 0) + 1 },
      };
    }, {});

  const best = Object.values(counts).sort((a, b) => b.count - a.count)[0];
  return best?.name ?? "";
};

const extractMessageSenderName = (args: {
  readonly messageEvent: Element;
  readonly viewerName: string;
}): string => {
  const raw = extractMessageSenderNameRaw(args.messageEvent);
  if (!args.viewerName) return raw;

  return normalizeNameForCompare(raw) === normalizeNameForCompare(args.viewerName)
    ? "ME"
    : raw;
};

const extractMessageText = (messageEvent: Element): string => {
  const paragraphs = Array.from(messageEvent.querySelectorAll("p"));
  const text = paragraphs
    .map((p) =>
      normalizeWhitespace((p as HTMLElement).innerText ?? p.textContent),
    )
    .filter((t) => t.length > 0)
    .join("\n");
  return text;
};

/**
 * Extracts the last 3 messages from a messaging thread.
 */
const extractLastThreeMessages = (): { sender: string; text: string }[] => {
  const thread = getMessagingThreadElements();
  if (!thread) return [];

  const partnerName = extractSenderName();
  const viewerName = inferViewerName({
    partnerName,
    messageEvents: thread.messageEvents,
  });

  const isNotNull = <T>(value: T | null): value is T => value !== null;

  return thread.messageEvents
    .map((event) => {
      const senderName = extractMessageSenderName({
        messageEvent: event,
        viewerName,
      });
      const content = extractMessageText(event);
      return content
        ? {
            sender: senderName,
            text: content,
          }
        : null;
    })
    .filter(isNotNull)
    .slice(-3);
};

/**
 * Extracts messaging thread details: sender name and last 3 messages.
 */
const extractMessagingThreadDetails = (): {
  senderName: string;
  messages: { sender: string; text: string }[];
} => {
  const senderName = extractSenderName();
  const messages = extractLastThreeMessages();
  return { senderName, messages };
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
 * Detects if we're on a messaging thread or a regular post and extracts accordingly.
 */
const handleSuggestionClick = (commentBox: Element) => {
  if (isMessagingThread()) {
    const { senderName, messages } = extractMessagingThreadDetails();
    if (!senderName && messages.length === 0) {
      alert("Could not extract messaging thread details.");
      return;
    }

    console.log("LinkedIn Assist extracted from message:", {
      senderName,
      messages,
    });
    createTextModal(JSON.stringify({ senderName, messages }, null, 2));
  } else {
    const { postContent, comments } = extractPostDetails(commentBox);
    if (!postContent) {
      alert("Could not extract post content.");
      return;
    }

    console.log("LinkedIn Assist extracted from post:", {
      postContent,
      comments,
    });
    createTextModal(JSON.stringify({ postContent, comments }, null, 2));
  }
};

/**
 * Adds a suggestion button next to the comment editor.
 */
const addSuggestionButton = (commentBox: Element) => {
  const button = createSuggestionButton(() =>
    handleSuggestionClick(commentBox),
  );
  attachButtonToCommentRow(commentBox, button);
  if (!isMessagingThread()) {
    markCommentaryText(commentBox);
  }
};

import type { CommentPromptOptions, RepostPromptOptions } from "../lib";
import { DOM, ensureEnterToSend, MessagesSchema, PostCommentsSchema, RepostSchema, setEditableText, UI } from "../lib";
import { buildLinkedInCommentPrompt, buildLinkedInRepostPrompt, buildMessagesPrompt } from "../prompt";
import {
	applyMessageTemplate,
	createMessageReplyModal,
	createPostCommentPromptModal,
	createRepostPromptModal,
	createTextModal,
	MESSAGE_REPLY_PRESETS,
} from "../ui";

// const randomLightHexColor = (): string => {
// 	let color = "#";
// 	for (let i = 0; i < 6; i++) {
// 		color += THEME.LIGHT_HEX_LETTERS[Math.floor(Math.random() * THEME.LIGHT_HEX_LETTERS.length)];
// 	}
// 	return color;
// };

const observer = new MutationObserver(() => {
	for (const editableTextArea of Array.from(document.querySelectorAll(DOM.SELECTORS.EDITABLE_COMMENT_BOX)).filter(
		(editableTextArea) => !editableTextArea.hasAttribute(DOM.ATTR.DATA_MUTATED)
	)) {
		editableTextArea.setAttribute(DOM.ATTR.DATA_MUTATED, "true");
		// (editableTextArea as HTMLElement).style.backgroundColor = randomLightHexColor();
		addIdeaButton(editableTextArea);
	}

	for (const anchor of findReactionsCountAnchors()) {
		anchor.setAttribute(DOM.ATTR.DATA_REPOST_IDEA, "true");
		attachRepostIdeaButton(anchor);
	}
});

observer.observe(document.body, { childList: true, subtree: true });

/**
 * Finds the feed container that owns the given anchor element (a comment editor or a
 * social-action-bar button — anything that lives inside a single feed item).
 * Works on both feed list and single post pages.
 */
const findFeedContainer = (anchor: Element): Element | null => {
	let container = anchor.closest(DOM.SELECTORS.FEED_FULL_UPDATE) ?? anchor.closest(DOM.SELECTORS.ROLE_LISTITEM);

	if (!container) {
		container = document.querySelector('div[class*="feed-shared-update-v2__control-menu-container"]');
	}

	return container;
};

/**
 * Finds the expandable-text-box elements that belong to the post itself, excluding
 * any that live inside the comment list. Used as a fallback when LinkedIn serves a
 * feed variant without any `data-view-name` attributes (so FEED_COMMENTARY and
 * COMMENT_COMMENTARY can't be found at all).
 */
const findPostExpandableTextBoxes = (container: Element): Element[] => {
	const commentList = container.querySelector(DOM.SELECTORS.POST_COMMENT_LIST);
	return Array.from(container.querySelectorAll(DOM.SELECTORS.EXPANDABLE_TEXT_BOX)).filter((el) => !(commentList && commentList.contains(el)));
};

/**
 * Finds the commentary text element for the feed item containing the anchor
 * (a comment editor or a social-action-bar button).
 * Works on both feed list and single post pages.
 */
const findCommentaryTextElement = (anchor: Element): Element | null => {
	// Try to locate the feed container first (list view or single post).
	let container = findFeedContainer(anchor);

	// If not found, fallback to the article container used on full post pages.
	if (!container) {
		container = document.querySelector(DOM.SELECTORS.POST_ARTICLE_CONTAINER) as Element | null;
	}
	if (!container) return null;

	// Feed commentary (main post text) within the container.
	const commentary = container.querySelector(DOM.SELECTORS.FEED_COMMENTARY);
	if (commentary) {
		return commentary.querySelector(DOM.SELECTORS.EXPANDABLE_TEXT_BOX) ?? commentary;
	}

	// Alternate selector for post page commentary.
	const postCommentary = container.querySelector(DOM.SELECTORS.POST_COMMENTARY);
	if (postCommentary) return postCommentary;

	// Structural fallback for the no-data-view-name feed variant.
	const [firstPostTextBox] = findPostExpandableTextBoxes(container);
	if (firstPostTextBox) return firstPostTextBox;

	return null;
};

/**
 * Extracts text from a comment commentary element.
 */
const extractCommentaryText = (commentary: Element): string => {
	const textElement = commentary.querySelector(DOM.SELECTORS.EXPANDABLE_TEXT_BOX) ?? commentary;
	return (textElement.textContent ?? "").trim();
};

/**
 * Extracts comment text from the comment list within the same feed item.
 * Works on both feed list and single post pages.
 */
const extractPostComments = (anchor: Element): string[] => {
	const container = findFeedContainer(anchor);
	if (!container) return [];

	const commentaries = Array.from(container.querySelectorAll(DOM.SELECTORS.COMMENT_COMMENTARY));

	if (commentaries.length > 0) {
		return commentaries.map(extractCommentaryText).filter((comment) => comment.length > 0);
	}

	const singlePostComments = Array.from(container.querySelectorAll(DOM.SELECTORS.SINGLE_POST_COMMENT));

	if (singlePostComments.length > 0) {
		return singlePostComments
			.map((article) => {
				const contentDiv = article.querySelector(DOM.SELECTORS.SINGLE_POST_COMMENT_CONTENT);
				return contentDiv?.textContent?.trim() ?? "";
			})
			.filter((comment) => comment.length > 0);
	}

	// Structural fallback for the no-data-view-name feed variant: every expandable-text-box
	// inside the comment list wrapper is a comment (or reply).
	const commentList = container.querySelector(DOM.SELECTORS.POST_COMMENT_LIST);
	if (!commentList) return [];

	return Array.from(commentList.querySelectorAll(DOM.SELECTORS.EXPANDABLE_TEXT_BOX))
		.map(extractCommentaryText)
		.filter((comment) => comment.length > 0);
};

/**
 * Extracts the feed post text from the commentary section.
 * Handles both feed list and single post page structures.
 */
const extractPostContent = (anchor: Element): string => {
	const commentaryTextElement = findCommentaryTextElement(anchor);
	if (!commentaryTextElement) return "";

	// Directly return trimmed text content of the found element.
	return (commentaryTextElement.textContent ?? "").trim();
};

/**
 * Extracts the feed post content and comment array.
 */
const extractPostDetails = (anchor: Element): { postText: string; comments: string[] } => {
	const postText = extractPostContent(anchor);
	const comments = extractPostComments(anchor);
	return { postText, comments };
};

const normalizeWhitespace = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();

const ADVANCED_PRESET_LABEL = "Advance";

const isOnMessagingThreadRoute = (): boolean => window.location.pathname.startsWith("/messaging/thread/");

/**
 * Checks if the current page is a messaging thread.
 */
const isMessagingThread = (): boolean => {
	if (isOnMessagingThreadRoute()) return true;
	return document.querySelector(DOM.SELECTORS.MESSAGING_THREAD_CONTAINER) !== null;
};

/**
 * Extracts the sender name from a messaging thread.
 * Returns the name of the other participant.
 */
const extractSenderName = (): string => {
	const threadContainer = document.querySelector(DOM.SELECTORS.MESSAGING_THREAD_CONTAINER);
	if (!threadContainer) return "";

	const partnerHeading = threadContainer.querySelector(DOM.SELECTORS.MESSAGING_THREAD_PARTNER_NAME);
	const partnerName = normalizeWhitespace(partnerHeading?.textContent);
	if (partnerName) return partnerName;

	const fallbackHeading = threadContainer.querySelector("h2");
	return normalizeWhitespace(fallbackHeading?.textContent);
};

const extractMessageSenderNameRaw = (messageEvent: Element): string => {
	const senderLinks = Array.from(messageEvent.querySelectorAll(DOM.SELECTORS.MESSAGING_SENDER_NAME));

	// Fallback: if LinkedIn changes the meta markup, try a broader search but avoid @mention links
	// inside the message body.
	const fallbackLinks = senderLinks.length ? [] : Array.from(messageEvent.querySelectorAll("a[href*='/in/']")).filter((a) => a.closest("p") === null);

	const linksToConsider = senderLinks.length > 0 ? senderLinks : fallbackLinks;

	const candidates = linksToConsider
		// biome-ignore lint/performance/useTopLevelRegex: <-- acceptable here -->
		.map((a) => normalizeWhitespace(a.textContent).replace(/^@/, ""))
		.filter((text) => text.length > 0)
		.filter((text) => !text.toLowerCase().startsWith("view "));

	// biome-ignore lint/style/useAtIndex: <-- prefer at() here but TS target is ES2020 -->
	const last = candidates.length > 0 ? candidates[candidates.length - 1] : undefined;
	return last ?? "Unknown";
};

const getMessagingThreadElements = (): {
	readonly threadContainer: Element;
	readonly messageEvents: readonly Element[];
} | null => {
	const threadContainer = document.querySelector(DOM.SELECTORS.MESSAGING_THREAD_CONTAINER);
	if (!threadContainer) return null;

	const messageList = threadContainer.querySelector(DOM.SELECTORS.MESSAGING_MESSAGE_LIST);
	if (!messageList) return null;

	const messageEvents = Array.from(messageList.querySelectorAll(DOM.SELECTORS.MESSAGING_MESSAGE_EVENT));

	return { threadContainer, messageEvents };
};

const extractMessageText = (messageEvent: Element): string => {
	const paragraphs = Array.from(messageEvent.querySelectorAll("p"));
	const text = paragraphs
		.map((p) => normalizeWhitespace((p as HTMLElement).innerText ?? p.textContent))
		.filter((t) => t.length > 0)
		.join("\n");
	return text;
};

/**
 * Extracts the last 3 messages from a messaging thread.
 */
const extractLastThreeMessages = (): ReadonlyArray<{
	sender: string;
	text: string;
}> => {
	const thread = getMessagingThreadElements();
	if (!thread) return [];

	const isNotNull = <T>(value: T | null): value is T => value !== null;

	return thread.messageEvents
		.map((event) => {
			const senderName = extractMessageSenderNameRaw(event);
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
	messages: ReadonlyArray<{ sender: string; text: string }>;
} => {
	const senderName = extractSenderName();
	const messages = extractLastThreeMessages();
	return { senderName, messages };
};

/**
 * Builds the idea button element.
 */
const createIdeaButton = (onClick: () => void, label = "Generate a reply idea"): HTMLButtonElement => {
	const button = document.createElement("button");
	button.classList.add(UI.CLASSES.IDEA_BUTTON);
	button.type = "button";
	button.title = label;
	button.setAttribute("aria-label", label);
	button.innerHTML = UI.SVG.IDEA;
	button.addEventListener("click", onClick);
	return button;
};

const createPresetPanel = (editableTextArea: Element): HTMLDivElement => {
	const panel = document.createElement("div");
	panel.classList.add(UI.CLASSES.PRESET_PANEL);
	panel.style.display = "none";

	const recipientName = extractSenderName();

	const presetButtons = MESSAGE_REPLY_PRESETS.map((preset) => {
		const button = document.createElement("button");
		button.type = "button";
		button.classList.add(UI.CLASSES.PRESET_ITEM);
		button.textContent = preset.label;
		button.addEventListener("click", () => {
			const message = applyMessageTemplate(preset.template, recipientName);
			setEditableText(editableTextArea, message);
			panel.style.display = "none";
		});
		return button;
	});

	const advancedButton = document.createElement("button");
	advancedButton.type = "button";
	advancedButton.classList.add(UI.CLASSES.PRESET_ITEM, UI.CLASSES.PRESET_ITEM_ADVANCED);
	advancedButton.textContent = ADVANCED_PRESET_LABEL;
	advancedButton.addEventListener("click", () => {
		panel.style.display = "none";
		openMessagingPromptModal(editableTextArea);
	});

	for (const button of [...presetButtons, advancedButton]) {
		panel.appendChild(button);
	}

	return panel;
};

/**
 * Adds comment-row styling and button to the editor row.
 */
const attachButtonToCommentRow = (editableTextArea: Element, button: HTMLButtonElement, panel?: HTMLDivElement) => {
	const parent = editableTextArea.parentElement;
	if (!parent) return;

	const actions = document.createElement("div");
	actions.classList.add(UI.CLASSES.QUICK_ACTIONS);
	actions.appendChild(button);
	if (panel) actions.appendChild(panel);
	parent.appendChild(actions);

	parent.classList.add(UI.CLASSES.COMMENT_ROW);
	(editableTextArea as HTMLElement).classList.add(UI.CLASSES.COMMENT_EDITOR);
};

/**
 * Tags the feed commentary text element for styling.
 */
const markCommentaryText = (editableTextArea: Element) => {
	const commentaryTextElement = findCommentaryTextElement(editableTextArea);
	if (!commentaryTextElement) {
		return;
	}

	commentaryTextElement.classList.add(UI.CLASSES.COMMENTARY_TEXT);
};

/**
 * Handles idea button clicks for a comment editor.
 * Detects if we're on a messaging thread or a regular post and extracts accordingly.
 */
const openMessagingPromptModal = (editableTextArea: Element) => {
	const { senderName, messages } = extractMessagingThreadDetails();
	if (!senderName && messages.length === 0) {
		alert("Could not extract messaging thread details.");
		return;
	}

	const parsed = MessagesSchema.safeParse({ senderName, messages });
	if (!parsed.success) {
		console.warn("LinkedIn Assist messaging schema validation failed:", {
			issues: parsed.error.issues,
			senderName,
			messages,
		});
		alert("Extracted messaging data could not be validated.");
		return;
	}

	console.log("LinkedIn Assist extracted from message:", {
		senderName,
		messages,
	});
	createMessageReplyModal({
		data: parsed.data,
		buildPrompt: buildMessagesPrompt,
		onSubmit: (result) => {
			if (result.mode === "preset") {
				setEditableText(editableTextArea, result.text);
				return;
			}
			createTextModal(result.text, "Generated Prompt");
		},
	});
};

const openPostPromptModal = (editableTextArea: Element) => {
	const { postText, comments } = extractPostDetails(editableTextArea);
	if (!postText) {
		alert("Could not extract post content.");
		return;
	}

	const parsed = PostCommentsSchema.safeParse({ postText, comments });
	if (!parsed.success) {
		console.warn("LinkedIn Assist post schema validation failed:", {
			issues: parsed.error.issues,
			postText,
			comments,
		});
		alert("Extracted post data could not be validated.");
		return;
	}

	console.log("LinkedIn Assist extracted from post:", {
		postText,
		comments,
	});
	createPostCommentPromptModal({
		postText: parsed.data.postText,
		comments: parsed.data.comments,
		onSubmit: (options: CommentPromptOptions) => {
			createTextModal(buildLinkedInCommentPrompt(options));
		},
	});
};

const handleIdeaClick = (editableTextArea: Element) => {
	openPostPromptModal(editableTextArea);
};

/**
 * Opens the repost-with-thoughts prompt modal for the feed item that owns `repostButton`.
 */
const openRepostPromptModal = (repostButton: Element) => {
	const postText = extractPostContent(repostButton);
	if (!postText) {
		alert("Could not extract post content.");
		return;
	}

	const parsed = RepostSchema.safeParse({ postText });
	if (!parsed.success) {
		console.warn("LinkedIn Assist repost schema validation failed:", {
			issues: parsed.error.issues,
			postText,
		});
		alert("Extracted post data could not be validated.");
		return;
	}

	console.log("LinkedIn Assist extracted for repost:", { postText });
	createRepostPromptModal({
		postText: parsed.data.postText,
		onSubmit: (options: RepostPromptOptions) => {
			createTextModal(buildLinkedInRepostPrompt(options));
		},
	});
};

/**
 * LinkedIn's reaction count is rendered as leaf text, either a plain count ("376 reactions",
 * "5 likes", abbreviated forms like "1.2K reactions") or, when a connection reacted, a name-led
 * phrase ("Naqib Khan and 62 others reacted", "Jane Doe likes this"). There's no stable class,
 * aria-label, or data-* hook on it, so it has to be matched by its own text content.
 */
const REACTION_COUNT_TEXT_PATTERN = /^\d[\d,.]*[km]?\+?\s*(reactions?|likes?)$|reacted$|likes this$/i;

/**
 * Finds the top-level containers to scan for a reaction count: one per feed post.
 * Falls back to the single-post-page article container when the feed's listitem
 * wrapper isn't present.
 */
const findPostContainers = (): Element[] => {
	const listItems = Array.from(document.querySelectorAll(DOM.SELECTORS.ROLE_LISTITEM));
	if (listItems.length > 0) return listItems;

	const articleContainer = document.querySelector(DOM.SELECTORS.POST_ARTICLE_CONTAINER);
	return articleContainer ? [articleContainer] : [];
};

/**
 * Finds the reaction-count element within a post container (its clickable ancestor, if any),
 * excluding matches inside the comment list so a comment's own like count isn't picked up.
 */
const findReactionsCountAnchor = (container: Element): Element | null => {
	const commentList = container.querySelector(DOM.SELECTORS.POST_COMMENT_LIST);

	const leafSpan = Array.from(container.querySelectorAll("span")).find(
		(span) => span.children.length === 0 && REACTION_COUNT_TEXT_PATTERN.test((span.textContent ?? "").trim()) && !commentList?.contains(span)
	);
	if (!leafSpan) return null;

	return leafSpan.closest("a, button") ?? leafSpan.parentElement;
};

/**
 * Finds reaction-count anchors across all visible posts that we haven't already wired up.
 */
const findReactionsCountAnchors = (): Element[] =>
	findPostContainers()
		.map((container) => findReactionsCountAnchor(container))
		.filter((anchor): anchor is Element => anchor !== null && !anchor.hasAttribute(DOM.ATTR.DATA_REPOST_IDEA));

/**
 * Adds a "repost with your thoughts" idea button right after the post's reaction count.
 */
const attachRepostIdeaButton = (anchor: Element) => {
	if (!(anchor instanceof HTMLElement)) return;

	const button = createIdeaButton(() => openRepostPromptModal(anchor), UI.TEXT.REPOST_IDEA_BUTTON);
	const actions = document.createElement("div");
	actions.classList.add(UI.CLASSES.QUICK_ACTIONS);
	actions.appendChild(button);
	anchor.insertAdjacentElement("afterend", actions);
};

/**
 * Adds a idea button next to the comment editor.
 */
const addIdeaButton = (editableTextArea: Element) => {
	const panel = isMessagingThread() ? createPresetPanel(editableTextArea) : undefined;
	if (panel) ensureEnterToSend(editableTextArea as HTMLElement);
	const button = createIdeaButton(() => {
		if (panel) {
			panel.style.display = panel.style.display === "none" ? "" : "none";
			return;
		}
		handleIdeaClick(editableTextArea);
	});
	attachButtonToCommentRow(editableTextArea, button, panel);
	if (!isMessagingThread()) {
		markCommentaryText(editableTextArea);
	}
};

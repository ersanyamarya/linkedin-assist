import type { CommentPromptOptions, RepostPromptOptions } from "../lib";
import { DOM, ensureEnterToSend, MessagesSchema, PostCommentsSchema, RepostSchema, setEditableText, UI } from "../lib";
import { buildLinkedInCommentPrompt, buildLinkedInRepostPrompt, buildMessagesPrompt } from "../prompt";
import {
	createIdeaButton,
	createMessageReplyModal,
	createPostCommentPromptModal,
	createQuickRepliesPanel,
	createRepostPromptModal,
	createTextModal,
	type QuickRepliesPanel,
	showNotice,
} from "../ui";
import {
	extractMessagingThreadDetails,
	extractPostContent,
	extractPostDetails,
	extractSenderName,
	findCommentaryTextElement,
	findReactionsCountAnchors,
	isMessagingThread,
} from "./extract";

const observer = new MutationObserver(() => {
	for (const editableTextArea of Array.from(document.querySelectorAll(DOM.SELECTORS.EDITABLE_COMMENT_BOX)).filter(
		(editableTextArea) => !editableTextArea.hasAttribute(DOM.ATTR.DATA_MUTATED)
	)) {
		editableTextArea.setAttribute(DOM.ATTR.DATA_MUTATED, "true");
		addIdeaButton(editableTextArea);
	}

	for (const anchor of findReactionsCountAnchors()) {
		anchor.setAttribute(DOM.ATTR.DATA_REPOST_IDEA, "true");
		attachRepostIdeaButton(anchor);
	}
});

observer.observe(document.body, { childList: true, subtree: true });

/**
 * Adds comment-row styling and button to the editor row.
 */
const attachButtonToCommentRow = (editableTextArea: Element, button: HTMLButtonElement) => {
	const parent = editableTextArea.parentElement;
	if (!parent) return;

	const actions = document.createElement("div");
	actions.classList.add(UI.CLASSES.QUICK_ACTIONS);
	actions.appendChild(button);
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
		showNotice("Couldn't read this conversation", "Wait for the messages to finish loading, then click the bulb again.");
		return;
	}

	const parsed = MessagesSchema.safeParse({ senderName, messages });
	if (!parsed.success) {
		console.warn("LinkedIn Assist messaging schema validation failed:", {
			issues: parsed.error.issues,
			senderName,
			messages,
		});
		showNotice("Couldn't use this conversation's messages", "Something in them didn't look right. Reload the page and try again.");
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
			createTextModal(result.text, "Your reply prompt is ready");
		},
	});
};

const openPostPromptModal = (editableTextArea: Element) => {
	const { postText, comments } = extractPostDetails(editableTextArea);
	if (!postText) {
		showNotice("Couldn't read this post", "LinkedIn may still be loading it. Scroll the post fully into view, then click the bulb again.");
		return;
	}

	const parsed = PostCommentsSchema.safeParse({ postText, comments });
	if (!parsed.success) {
		console.warn("LinkedIn Assist post schema validation failed:", {
			issues: parsed.error.issues,
			postText,
			comments,
		});
		showNotice("Couldn't use this post's text", "Something in it didn't look right. Reload the page and try again.");
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
			createTextModal(buildLinkedInCommentPrompt(options), "Your comment prompt is ready");
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
		showNotice("Couldn't read this post", "LinkedIn may still be loading it. Scroll the post fully into view, then click the bulb again.");
		return;
	}

	const parsed = RepostSchema.safeParse({ postText });
	if (!parsed.success) {
		console.warn("LinkedIn Assist repost schema validation failed:", {
			issues: parsed.error.issues,
			postText,
		});
		showNotice("Couldn't use this post's text", "Something in it didn't look right. Reload the page and try again.");
		return;
	}

	console.log("LinkedIn Assist extracted for repost:", { postText });
	createRepostPromptModal({
		postText: parsed.data.postText,
		onSubmit: (options: RepostPromptOptions) => {
			createTextModal(buildLinkedInRepostPrompt(options), "Your repost prompt is ready");
		},
	});
};

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
 * Adds a idea button next to the comment editor. In messaging (the Messaging page and chat
 * pop-ups) it opens the quick-replies panel; elsewhere it starts the comment prompt flow.
 */
const addIdeaButton = (editableTextArea: Element) => {
	const isMessaging = isMessagingThread();
	let quickReplies: QuickRepliesPanel | undefined;

	const button = createIdeaButton(
		() => {
			if (quickReplies) {
				quickReplies.toggle();
				return;
			}
			handleIdeaClick(editableTextArea);
		},
		isMessaging ? UI.TEXT.QUICK_REPLIES_BUTTON : undefined
	);

	if (isMessaging) {
		ensureEnterToSend(editableTextArea as HTMLElement);
		quickReplies = createQuickRepliesPanel({
			button,
			editor: editableTextArea as HTMLElement,
			getRecipientName: () => extractSenderName(editableTextArea),
			onInsert: (text) => setEditableText(editableTextArea, text),
			onMoreOptions: () => openMessagingPromptModal(editableTextArea),
		});
	}

	attachButtonToCommentRow(editableTextArea, button);
	if (!isMessaging) {
		markCommentaryText(editableTextArea);
	}
};

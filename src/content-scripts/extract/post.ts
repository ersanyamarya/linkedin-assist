import { DOM } from "../../lib";

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
	return Array.from(container.querySelectorAll(DOM.SELECTORS.EXPANDABLE_TEXT_BOX)).filter((el) => !commentList?.contains(el));
};

/**
 * Finds the commentary text element for the feed item containing the anchor
 * (a comment editor or a social-action-bar button).
 * Works on both feed list and single post pages.
 */
export const findCommentaryTextElement = (anchor: Element): Element | null => {
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
export const extractPostContent = (anchor: Element): string => {
	const commentaryTextElement = findCommentaryTextElement(anchor);
	if (!commentaryTextElement) return "";

	// Directly return trimmed text content of the found element.
	return (commentaryTextElement.textContent ?? "").trim();
};

/**
 * Extracts the feed post content and comment array.
 */
export const extractPostDetails = (anchor: Element): { postText: string; comments: string[] } => {
	const postText = extractPostContent(anchor);
	const comments = extractPostComments(anchor);
	return { postText, comments };
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
export const findReactionsCountAnchors = (): Element[] =>
	findPostContainers()
		.map((container) => findReactionsCountAnchor(container))
		.filter((anchor): anchor is Element => anchor !== null && !anchor.hasAttribute(DOM.ATTR.DATA_REPOST_IDEA));

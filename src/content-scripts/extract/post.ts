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

/** The feed item containing the anchor, or the article container used on full post pages. */
const findPostContainer = (anchor: Element): Element | null => findFeedContainer(anchor) ?? document.querySelector(DOM.SELECTORS.POST_ARTICLE_CONTAINER);

const textBoxOrSelf = (commentary: Element): Element => commentary.querySelector(DOM.SELECTORS.EXPANDABLE_TEXT_BOX) ?? commentary;

/** Post-page selector first, then the structural fallback for the no-data-view-name feed variant. */
const findFallbackCommentary = (container: Element): Element | null =>
	container.querySelector(DOM.SELECTORS.POST_COMMENTARY) ?? findPostExpandableTextBoxes(container)[0] ?? null;

const findCommentaryIn = (container: Element): Element | null => {
	const commentary = container.querySelector(DOM.SELECTORS.FEED_COMMENTARY);
	return commentary ? textBoxOrSelf(commentary) : findFallbackCommentary(container);
};

/**
 * Finds the commentary text element for the feed item containing the anchor
 * (a comment editor or a social-action-bar button).
 * Works on both feed list and single post pages.
 */
export const findCommentaryTextElement = (anchor: Element): Element | null => {
	const container = findPostContainer(anchor);
	return container ? findCommentaryIn(container) : null;
};

/**
 * Finds the element holding each comment's text within the feed item, in document order.
 * Works on both feed list and single post pages.
 */
const findCommentTextElements = (container: Element): Element[] => {
	const commentaries = Array.from(container.querySelectorAll(DOM.SELECTORS.COMMENT_COMMENTARY));
	if (commentaries.length > 0) return commentaries.map((commentary) => commentary.querySelector(DOM.SELECTORS.EXPANDABLE_TEXT_BOX) ?? commentary);

	const singlePostComments = Array.from(container.querySelectorAll(DOM.SELECTORS.SINGLE_POST_COMMENT));
	if (singlePostComments.length > 0) {
		return singlePostComments
			.map((article) => article.querySelector(DOM.SELECTORS.SINGLE_POST_COMMENT_CONTENT))
			.filter((content): content is Element => content !== null);
	}

	// Structural fallback for the no-data-view-name feed variant: every expandable-text-box
	// inside the comment list wrapper is a comment (or reply).
	const commentList = container.querySelector(DOM.SELECTORS.POST_COMMENT_LIST);
	return commentList ? Array.from(commentList.querySelectorAll(DOM.SELECTORS.EXPANDABLE_TEXT_BOX)) : [];
};

const textOf = (element: Element): string => (element.textContent ?? "").trim();

/**
 * Extracts comment text from the comment list within the same feed item.
 * Works on both feed list and single post pages.
 */
const extractPostComments = (anchor: Element): string[] => {
	const container = findFeedContainer(anchor);
	if (!container) return [];

	return findCommentTextElements(container)
		.map(textOf)
		.filter((comment) => comment.length > 0);
};

/**
 * The comment a reply editor answers, or undefined when the editor is the post's own comment box.
 * LinkedIn's classes are hashed, so this goes by position: a reply box opens right after the comment
 * (and any earlier replies) it belongs to, while the top-level comment box sits above every comment.
 * So the last comment that comes before the editor in the page is the one being answered.
 */
export const extractReplyTarget = (anchor: Element): string | undefined => {
	const container = findFeedContainer(anchor);
	if (!container) return;

	const preceding = findCommentTextElements(container).filter(
		(comment) =>
			!comment.contains(anchor) && // biome-ignore lint/suspicious/noBitwiseOperators: compareDocumentPosition returns a bitmask
			comment.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING &&
			textOf(comment).length > 0
	);
	const target = preceding.at(-1);
	return target ? textOf(target) : undefined;
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

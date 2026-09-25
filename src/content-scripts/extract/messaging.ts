import { DOM, normalizeWhitespace } from "../../lib";

const isOnMessagingThreadRoute = (): boolean => window.location.pathname.startsWith("/messaging/thread/");

/**
 * Checks if the current page is a messaging thread.
 */
export const isMessagingThread = (): boolean => {
	if (isOnMessagingThreadRoute()) return true;
	return document.querySelector(DOM.SELECTORS.MESSAGING_THREAD_CONTAINER) !== null;
};

/**
 * Extracts the sender name from a messaging thread.
 * Returns the name of the other participant.
 */
export const extractSenderName = (scope?: Element): string => {
	// Prefer the thread that contains the editor, so the right name is used when several chat pop-ups are open.
	const threadContainer = scope?.closest(DOM.SELECTORS.MESSAGING_THREAD_CONTAINER) ?? document.querySelector(DOM.SELECTORS.MESSAGING_THREAD_CONTAINER);
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
export const extractMessagingThreadDetails = (): {
	senderName: string;
	messages: ReadonlyArray<{ sender: string; text: string }>;
} => {
	const senderName = extractSenderName();
	const messages = extractLastThreeMessages();
	return { senderName, messages };
};

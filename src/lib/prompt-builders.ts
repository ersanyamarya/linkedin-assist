import type { Messages, PostComments } from "./schemas";

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const normalizeTextBlock = (value: string): string => {
	const normalized = value
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((line) => normalizeWhitespace(line))
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	return normalized;
};

const joinSections = (sections: readonly string[], breath = false): string =>
	sections
		.map((section) => section.trim())
		.filter((section) => section.length > 0)
		.join(`${breath ? "\n\n" : "\n"}`);

const asFencedTextBlock = (label: string, content: string): string => {
	const body = normalizeTextBlock(content);
	return joinSections([`## ${label}`, `\`\`\`text\n${body || "(empty)"}\n\`\`\``]);
};

/**
 * Converts extracted post + comments data into a simple text prompt.
 *
 * Keep this intentionally lightweight for now; it's meant to be iterated on.
 */
export const buildPostCommentsPrompt = (data: PostComments): string => {
	const goal = joinSections(["## Goal", "You are an assistant helping me write a LinkedIn comment."]);

	const post = asFencedTextBlock("Post", data.postText);

	const comments =
		data.comments.length === 0
			? joinSections(["## Visible comments", "*(none)*"])
			: joinSections(["## Visible comments", data.comments.map((c, i) => `- ${i + 1}. ${normalizeTextBlock(c)}`).join("\n")]);

	const instructions = joinSections(["## Instructions", "- Draft a thoughtful reply that matches the tone of the thread.", "- Keep it concise."]);

	return joinSections([goal, post, comments, instructions], true);
};

/**
 * Converts extracted LinkedIn messaging thread data into a simple text prompt.
 *
 * Keep this intentionally lightweight for now; it's meant to be iterated on.
 */
export const buildMessagesPrompt = (data: Messages): string => {
	const goal = joinSections(["## Goal", "You are an assistant helping me reply in a LinkedIn message thread."]);

	const context = joinSections(["## Context", `**Conversation with:** ${normalizeWhitespace(data.senderName) || "(unknown)"}`]);

	const messages =
		data.messages.length === 0
			? joinSections(["## Recent messages", "*(none)*"])
			: joinSections([
					"## Recent messages",
					data.messages
						.map((m) => {
							const who = normalizeWhitespace(m.sender) || "Unknown";
							const text = normalizeTextBlock(m.text);
							return `- **${who}:** ${text}`;
						})
						.join("\n"),
				]);

	const instructions = joinSections(["## Instructions", "- Write a helpful, friendly reply.", "- Keep it short."]);

	return joinSections([goal, context, messages, instructions], true);
};

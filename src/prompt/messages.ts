import type { Messages } from "../lib";

/**
 * Options to tailor message prompt formatting and context.
 */
export type MessagePromptOptions = {
	readonly currentUserName: string | undefined;
	readonly recipientName: string | undefined;
	readonly extraInstructions: string | undefined;
};

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

const normalizeNameMatch = (value: string): string => value.toLowerCase();

const resolveSenderLabel = (sender: string, options: MessagePromptOptions): string => {
	const senderName = normalizeWhitespace(sender) || "Unknown";
	const normalizedSender = normalizeNameMatch(senderName);
	const normalizedYou = normalizeNameMatch(options.currentUserName ?? "");
	const normalizedRecipient = normalizeNameMatch(options.recipientName ?? "");

	if (normalizedYou && normalizedSender === normalizedYou) return "You";
	if (normalizedRecipient && normalizedSender === normalizedRecipient) return options.recipientName ?? senderName;

	return senderName;
};

const buildExtraInstructionsBlock = (extraInstructions: string | undefined): string =>
	extraInstructions ? joinSections(["## Extra instructions", extraInstructions]) : "";

export const buildMessagesPrompt = (
	data: Messages,
	options: MessagePromptOptions = { currentUserName: undefined, recipientName: undefined, extraInstructions: undefined }
): string => {
	const goal = joinSections(["## Goal", "You are an assistant helping me reply in a LinkedIn message thread."]);

	const conversationWith = normalizeWhitespace(options.recipientName ?? data.senderName) || "(unknown)";
	const context = joinSections(["## Context", `**Conversation with:** ${conversationWith}`]);

	const messages =
		data.messages.length === 0
			? joinSections(["## Recent messages", "*(none)*"])
			: joinSections([
					"## Recent messages",
					data.messages
						.map((m) => {
							const who = resolveSenderLabel(m.sender, options);
							const text = normalizeTextBlock(m.text);
							return `- **${who}:** ${text}`;
						})
						.join("\n"),
				]);

	const instructions = joinSections(["## Instructions", "- Write a helpful, friendly reply.", "- Keep it short."]);
	const extras = buildExtraInstructionsBlock(options.extraInstructions);

	return joinSections([goal, context, messages, instructions, extras], true);
};

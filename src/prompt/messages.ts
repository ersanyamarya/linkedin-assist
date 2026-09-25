import { type MessagePromptOptions, type Messages, normalizeWhitespace } from "../lib";
import { asFencedBlock, buildExtraInstructionsBlock, buildToneBlock, joinSections } from "./prompt-utils";
import { buildSystemBlock } from "./system-instructions";

/**
 * Options to tailor message prompt formatting and context.
 */
export type { MessagePromptOptions } from "../lib";

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

const normalizeNameMatch = (value: string): string => value.toLowerCase();

const resolveSenderLabel = (sender: string, options: MessagePromptOptions): string => {
	const senderName = normalizeWhitespace(sender) || "Unknown";
	const normalizedSender = normalizeNameMatch(senderName);
	const normalizedYou = normalizeNameMatch(options.currentUserName ?? "");
	const normalizedRecipient = normalizeNameMatch(options.recipientName ?? "");

	if (normalizedYou && normalizedSender === normalizedYou) return "Me";
	if (normalizedRecipient && normalizedSender === normalizedRecipient) return options.recipientName ?? senderName;

	return senderName;
};

const buildTaskBlock = (recipientName: string | undefined, senderName: string): string => {
	const conversationWith = normalizeWhitespace(recipientName ?? senderName) || "the other person";
	return joinSections([
		"## Task",
		`Write my next message in this LinkedIn conversation with ${conversationWith}. Lines starting with "Me:" are mine. The last message is the most recent.`,
	]);
};

const buildMessagesBlock = (messages: readonly { sender: string; text: string }[], options: MessagePromptOptions): string => {
	if (messages.length === 0) return joinSections(["## Conversation", "No earlier messages. Write an opening message."]);

	const lines = messages.map((m) => `${resolveSenderLabel(m.sender, options)}: ${normalizeTextBlock(m.text)}`).join("\n\n");
	return asFencedBlock("Conversation (oldest first)", lines);
};

const lengthGuidance: Record<string, string> = {
	short: "One or two sentences.",
	medium: "Two to four sentences.",
	long: "A short paragraph or two, with more detail.",
};

const intentGuidance: Record<string, string> = {
	reply: "Answer their latest message.",
	"follow-up": "Follow up on where the conversation left off. Give them an easy reason to reply.",
	close: "Move toward a concrete next step, like a call, a decision or a clear wrap-up.",
	"qualify-lead": "Ask one or two questions that show whether they're a good fit, like their need, timing or who decides. Don't pitch.",
};

const formalityGuidance: Record<string, string> = {
	low: "Casual, like texting a colleague you know well.",
	medium: "Friendly but professional.",
	high: "Formal and professional.",
};

/** Renders a `## label` section from a guidance map. Omitted when the key is unset or unknown. */
const buildGuidanceBlock = (label: string, guidance: Record<string, string>, key: string | undefined): string => {
	const text = key ? guidance[key] : undefined;
	return text ? joinSections([`## ${label}`, text]) : "";
};

const buildCTABlock = (includeCTA: boolean | undefined): string =>
	includeCTA ? joinSections(["## Call to action", "End with one clear next step or question."]) : "";

const buildOutputBlock = (): string =>
	joinSections(["## Output", "Only the message text, ready to paste. No quotes around it and no email-style sign-off, since this is a chat thread."]);

const buildPromptParts = (data: Messages, options: MessagePromptOptions): readonly string[] => [
	buildSystemBlock(),
	buildTaskBlock(options.recipientName, data.senderName),
	buildMessagesBlock(data.messages, options),
	buildGuidanceBlock("Goal", intentGuidance, options.intent),
	buildToneBlock(options.tone),
	buildGuidanceBlock("Formality", formalityGuidance, options.formality),
	buildGuidanceBlock("Length", lengthGuidance, options.length),
	buildCTABlock(options.includeCTA),
	buildExtraInstructionsBlock(options.extraInstructions),
	buildOutputBlock(),
];

/**
 * Builds a prompt for an LLM to generate a reply in a LinkedIn message thread.
 */
export const buildMessagesPrompt = (data: Messages, options: MessagePromptOptions = {}): string => joinSections(buildPromptParts(data, options));

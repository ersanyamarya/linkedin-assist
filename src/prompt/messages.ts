import type { MessagePromptOptions, Messages } from "../lib";
import { asFencedBlock, joinSections } from "./prompt-utils";
import { SYSTEM_INSTRUCTIONS } from "./system-instructions";

/**
 * Options to tailor message prompt formatting and context.
 */
export type { MessagePromptOptions } from "../lib";

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

const buildGoalBlock = (): string => joinSections(["## Goal", "You are an assistant helping me reply in a LinkedIn message thread."]);
const buildSystemBlock = (): string => asFencedBlock("System instructions", SYSTEM_INSTRUCTIONS);
const buildContextBlock = (recipientName: string | undefined, senderName: string): string => {
	const conversationWith = normalizeWhitespace(recipientName ?? senderName) || "(unknown)";
	return joinSections(["## Context", `**Conversation with:** ${conversationWith}`]);
};

const buildMessagesBlock = (messages: readonly { sender: string; text: string }[], options: MessagePromptOptions): string => {
	if (messages.length === 0) {
		return joinSections(["## Recent messages", "*(none)*"]);
	}

	const messagesList = messages
		.map((m) => {
			const who = resolveSenderLabel(m.sender, options);
			const text = normalizeTextBlock(m.text);
			return `- **${who}:** ${text}`;
		})
		.join("\n");

	return joinSections(["## Recent messages", messagesList]);
};

const buildInstructionsBlock = (): string => joinSections(["## Instructions", "- Write a helpful, friendly reply.", "- Keep it short."]);

const buildToneBlock = (tone: string | undefined): string => (tone ? joinSections(["## Tone", `Use a ${tone} tone that feels authentic and natural.`]) : "");

const lengthGuidance: Record<string, string> = {
	short: "Keep it brief, 1-2 sentences if possible.",
	medium: "Medium length, 2-4 sentences.",
	long: "Feel free to write a longer, more detailed response.",
};

const buildLengthBlock = (length: string | undefined): string => {
	if (!length) return "";
	const guidance = lengthGuidance[length];
	return guidance ? joinSections(["## Length", guidance]) : "";
};

const intentGuidance: Record<string, string> = {
	reply: "Simply respond to the message.",
	"follow-up": "Follow up on the previous conversation.",
	close: "Try to move the conversation toward closure or next steps.",
	"qualify-lead": "Qualify the lead by asking relevant questions.",
};

const buildIntentBlock = (intent: string | undefined): string => {
	if (!intent) return "";
	const guidance = intentGuidance[intent];
	return guidance ? joinSections(["## Intent", guidance]) : "";
};

const formalityGuidance: Record<string, string> = {
	low: "Keep it casual and conversational, like texting a friend.",
	medium: "Balance between professional and casual.",
	high: "Use formal, professional language.",
};

const buildFormalityBlock = (formality: string | undefined): string => {
	if (!formality) return "";
	const guidance = formalityGuidance[formality];
	return guidance ? joinSections(["## Formality", guidance]) : "";
};

const buildCTABlock = (includeCTA: boolean | undefined): string =>
	includeCTA ? joinSections(["## Call-to-action", "Consider including a clear next step or question to keep the conversation going."]) : "";

const buildExtraInstructionsBlock = (extraInstructions: string | undefined): string =>
	extraInstructions ? joinSections(["## Extra instructions", extraInstructions]) : "";

const buildPromptParts = (data: Messages, options: MessagePromptOptions): readonly string[] => {
	return [
		buildSystemBlock(),
		buildGoalBlock(),
		buildContextBlock(options.recipientName, data.senderName),
		buildMessagesBlock(data.messages, options),
		buildInstructionsBlock(),
		buildToneBlock(options.tone),
		buildLengthBlock(options.length),
		buildIntentBlock(options.intent),
		buildFormalityBlock(options.formality),
		buildCTABlock(options.includeCTA),
		buildExtraInstructionsBlock(options.extraInstructions),
	].filter((part) => part.length > 0);
};

/**
 * Builds a prompt for an LLM to generate a reply in a LinkedIn message thread.
 */
export const buildMessagesPrompt = (data: Messages, options: MessagePromptOptions = {}): string => joinSections(buildPromptParts(data, options));

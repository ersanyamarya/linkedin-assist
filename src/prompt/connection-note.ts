import type { ConnectionNotePromptOptions } from "../lib";
import { asFencedBlock, buildExtraInstructionsBlock, buildTakeBlock, buildToneBlock, joinSections } from "./prompt-utils";
import { buildSystemBlock } from "./system-instructions";

const buildTaskBlock = (name: string): string =>
	joinSections([
		"## Task",
		`Write the note I attach to a LinkedIn connection request to ${name || "the person below"}. They don't know me yet. Give one specific, genuine reason to connect, drawn from their profile, so accepting feels easy. Don't pitch, don't ask for a favor, and don't flatter.`,
	]);

const buildProfileBlock = (profile: ConnectionNotePromptOptions["profile"]): string =>
	joinSections([
		asFencedBlock("Name", profile.name),
		asFencedBlock("Headline", profile.headline),
		profile.about ? asFencedBlock("About / summary", profile.about) : "",
		profile.experience ? asFencedBlock("Experience", profile.experience) : "",
		profile.recentActivity.length ? asFencedBlock("Recent posts", profile.recentActivity.map((post) => `• ${post}`).join("\n\n")) : "",
	]);

const buildLimitBlock = (maxChars: number): string =>
	joinSections([
		"## Length",
		`Hard limit: ${maxChars} characters including spaces. LinkedIn cuts anything longer. Aim for about ${Math.round(maxChars * 0.8)}.`,
	]);

const buildOutputBlock = (): string =>
	joinSections(["## Output", "Only the note text, ready to paste. Start with their first name. No quotes around it, no sign-off with my name, no hashtags."]);

/**
 * Builds a prompt for an LLM to draft a connection-request note from a profile. The character
 * limit is stated twice (length section and output) because models overshoot it easily.
 */
export const buildConnectionNotePrompt = (options: ConnectionNotePromptOptions): string => {
	const { profile, yourThoughts, emotion, maxChars, extraInstructions, voiceSamples } = options;

	return joinSections([
		buildSystemBlock({ voiceSamples }),
		buildTaskBlock(profile.name),
		buildProfileBlock(profile),
		buildTakeBlock("note", yourThoughts),
		buildToneBlock(emotion),
		buildLimitBlock(maxChars),
		buildExtraInstructionsBlock(extraInstructions),
		buildOutputBlock(),
	]);
};

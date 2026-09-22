import type { RepostPromptOptions } from "../lib";
import { asFencedBlock, joinSections } from "./prompt-utils";
import { SYSTEM_INSTRUCTIONS } from "./system-instructions";

const buildRoleBlock = (): string =>
	joinSections([
		"## Role",
		"You are an experienced LinkedIn voice known for thoughtful, natural, and engaging posts. Your task is to write a short repost caption — the note that goes on top when resharing someone else's post — that sounds like a real human and reflects genuine insight and perspective, not a summary of the original post.",
	]);

const buildSystemBlock = (): string => asFencedBlock("System instructions", SYSTEM_INSTRUCTIONS);

const buildPostBlock = (postText: string): string => asFencedBlock("Original post being reposted", postText);

const buildThoughtsBlock = (yourThoughts: string): string =>
	asFencedBlock("My perspective (Very important to consider while generating the caption) ", yourThoughts);

const buildEmotionBlock = (emotion: string): string =>
	joinSections([
		"## Tone",
		`The tone should convey a ${emotion} and authentic voice, not generic or formulaic. Avoid obvious AI cues or overly polished language.`,
	]);

const buildLengthBlock = (maxLengthWords: number | undefined): string =>
	maxLengthWords ? joinSections(["## Length", `Keep the repost caption under ${maxLengthWords} words.`]) : "";

const buildExtraInstructionsBlock = (extraInstructions: string | undefined): string =>
	extraInstructions ? asFencedBlock("Extra instructions", extraInstructions) : "";

const buildOutputBlock = (): string =>
	joinSections([
		"## Output",
		"Write only the repost caption in a natural and human manner. Reference the original post naturally without repeating it verbatim — the original post itself will already be attached beneath the caption when reposted.",
	]);

const buildPromptParts = (options: RepostPromptOptions): readonly string[] => {
	const { postText, yourThoughts, emotion, maxLengthWords, extraInstructions } = options;

	return [
		buildSystemBlock(),
		buildRoleBlock(),
		buildPostBlock(postText),
		buildThoughtsBlock(yourThoughts),
		buildEmotionBlock(emotion),
		buildLengthBlock(maxLengthWords),
		buildExtraInstructionsBlock(extraInstructions),
		buildOutputBlock(),
	];
};

/**
 * Builds a prompt for an LLM that drafts a repost-with-thoughts caption,
 * provides context, and avoids typical AI signals.
 */
export const buildLinkedInRepostPrompt = (options: RepostPromptOptions): string => joinSections(buildPromptParts(options));

import type { CommentPromptOptions } from "../lib";
import { asFencedBlock, joinSections } from "./prompt-utils";
import { SYSTEM_INSTRUCTIONS } from "./system-instructions";

const buildRoleBlock = (): string =>
	joinSections([
		"## Role",
		"You are an experienced LinkedIn commentator known for thoughtful, natural, and engaging responses. Your task is to write a comment that sounds like a real human and reflects genuine insight and perspective.",
	]);

const buildSystemBlock = (): string => asFencedBlock("System instructions", SYSTEM_INSTRUCTIONS);

const buildPostBlock = (postText: string): string => asFencedBlock("Post", postText);

const buildCommentsBlock = (selectedComments: readonly string[]): string =>
	selectedComments.length
		? joinSections(["## Reference comments", selectedComments.map((comment, index) => `- ${index + 1}. ${comment.trim()}`).join("\n")])
		: joinSections(["## Reference comments", "*(none)*"]);

const buildThoughtsBlock = (yourThoughts: string): string =>
	asFencedBlock("My perspective (Very important to consider while generating the reply) ", yourThoughts);

const buildEmotionBlock = (emotion: string): string =>
	joinSections([
		"## Tone",
		`The tone should convey a ${emotion} and authentic voice, not generic or formulaic. Avoid obvious AI cues or overly polished language.`,
	]);

const buildLengthBlock = (maxLengthWords: number | undefined): string =>
	maxLengthWords ? joinSections(["## Length", `Keep the comment under ${maxLengthWords} words.`]) : "";

const buildExtraInstructionsBlock = (extraInstructions: string | undefined): string =>
	extraInstructions ? asFencedBlock("Extra instructions", extraInstructions) : "";

const buildOutputBlock = (): string => joinSections(["## Output", "Write the final comment in a natural and human manner."]);

const buildPromptParts = (options: CommentPromptOptions): readonly string[] => {
	const { postText, selectedComments, yourThoughts, emotion, maxLengthWords, extraInstructions } = options;

	return [
		buildSystemBlock(),
		buildRoleBlock(),
		buildPostBlock(postText),
		buildCommentsBlock(selectedComments),
		buildThoughtsBlock(yourThoughts),
		buildEmotionBlock(emotion),
		buildLengthBlock(maxLengthWords),
		buildExtraInstructionsBlock(extraInstructions),
		buildOutputBlock(),
	];
};

/**
 * Builds a prompt for an LLM that sets a clear role,
 * provides context, and avoids typical AI signals.
 */
export const buildLinkedInCommentPrompt = (options: CommentPromptOptions): string => joinSections(buildPromptParts(options));

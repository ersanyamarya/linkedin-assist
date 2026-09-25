import type { CommentPromptOptions } from "../lib";
import {
	asFencedBlock,
	buildExtraInstructionsBlock,
	buildFactCheckBlock,
	buildTakeBlock,
	buildToneBlock,
	buildWordLimitBlock,
	joinSections,
} from "./prompt-utils";
import { buildSystemBlock } from "./system-instructions";

const buildTaskBlock = (): string =>
	joinSections([
		"## Task",
		"Write a comment on the LinkedIn post below, posted as me. Add something the post doesn't already say: a reaction, a related experience, a disagreement or a real question. Don't summarize the post back to its author.",
	]);

const buildPostBlock = (postText: string): string => asFencedBlock("Post", postText);

const buildCommentsBlock = (selectedComments: readonly string[]): string =>
	selectedComments.length
		? joinSections([
				"## Other comments",
				"Already posted by other people. Don't repeat their points.",
				selectedComments.map((comment, index) => `${index + 1}. ${comment.trim()}`).join("\n"),
			])
		: "";

const buildOutputBlock = (): string =>
	joinSections([
		"## Output",
		"Only the comment text, ready to paste. No quotes around it. No hashtags or @mentions unless the extra instructions ask for them.",
	]);

const buildPromptParts = (options: CommentPromptOptions): readonly string[] => {
	const { postText, selectedComments, yourThoughts, emotion, maxLengthWords, factCheck, extraInstructions } = options;

	return [
		buildSystemBlock(),
		buildTaskBlock(),
		buildPostBlock(postText),
		buildCommentsBlock(selectedComments),
		buildTakeBlock("comment", yourThoughts),
		buildToneBlock(emotion),
		buildWordLimitBlock(maxLengthWords),
		buildFactCheckBlock("comment", factCheck),
		buildExtraInstructionsBlock(extraInstructions),
		buildOutputBlock(),
	];
};

/**
 * Builds a prompt for an LLM to draft a LinkedIn comment. Shared writing rules come first,
 * then the task, the post, optional context and the user's own take.
 */
export const buildLinkedInCommentPrompt = (options: CommentPromptOptions): string => joinSections(buildPromptParts(options));

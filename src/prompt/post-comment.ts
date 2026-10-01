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

const buildTaskBlock = (replyTo: string | undefined): string =>
	joinSections([
		"## Task",
		replyTo
			? "Write my reply to the comment below, posted under the LinkedIn post. Respond to what they actually said: answer it, add a detail or ask one real follow-up. Skip the thank-you unless it adds something. Don't repeat the post or their comment back to them."
			: "Write a comment on the LinkedIn post below, posted as me. Add something the post doesn't already say: a reaction, a related experience, a disagreement or a real question. Don't summarize the post back to its author.",
	]);

const buildPostBlock = (postText: string): string => asFencedBlock("Post", postText);

const buildReplyToBlock = (replyTo: string | undefined): string => (replyTo ? asFencedBlock("Comment I'm replying to", replyTo) : "");

const buildCommentsBlock = (selectedComments: readonly string[]): string =>
	selectedComments.length
		? joinSections([
				"## Other comments",
				"Already posted by other people. Don't repeat their points.",
				selectedComments.map((comment, index) => `${index + 1}. ${comment.trim()}`).join("\n"),
			])
		: "";

const buildOutputBlock = (replyTo: string | undefined): string =>
	joinSections([
		"## Output",
		`Only the ${replyTo ? "reply" : "comment"} text, ready to paste. No quotes around it. No hashtags or @mentions unless the extra instructions ask for them.`,
	]);

const buildPromptParts = (options: CommentPromptOptions): readonly string[] => {
	const { postText, replyTo, selectedComments, yourThoughts, emotion, maxLengthWords, factCheck, extraInstructions, voiceSamples } = options;

	return [
		buildSystemBlock({ voiceSamples }),
		buildTaskBlock(replyTo),
		buildPostBlock(postText),
		buildReplyToBlock(replyTo),
		buildCommentsBlock(selectedComments),
		buildTakeBlock(replyTo ? "reply" : "comment", yourThoughts),
		buildToneBlock(emotion),
		buildWordLimitBlock(maxLengthWords),
		buildFactCheckBlock(replyTo ? "reply" : "comment", factCheck),
		buildExtraInstructionsBlock(extraInstructions),
		buildOutputBlock(replyTo),
	];
};

/**
 * Builds a prompt for an LLM to draft a LinkedIn comment, or a reply when `replyTo` is set. Shared
 * writing rules come first, then the task, the post, optional context and the user's own take.
 */
export const buildLinkedInCommentPrompt = (options: CommentPromptOptions): string => joinSections(buildPromptParts(options));

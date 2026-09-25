import type { RepostPromptOptions } from "../lib";
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
		"Write the caption I post on top when resharing the LinkedIn post below. The original post is attached under the caption, so don't summarize or quote it. Say why I'm sharing it: what I agree or disagree with, what it made me think of, or who should read it.",
	]);

const buildPostBlock = (postText: string): string => asFencedBlock("Post being reposted", postText);

const buildOutputBlock = (): string =>
	joinSections([
		"## Output",
		"Only the caption text, ready to paste. No quotes around it. No hashtags or @mentions unless the extra instructions ask for them.",
	]);

const buildPromptParts = (options: RepostPromptOptions): readonly string[] => {
	const { postText, yourThoughts, emotion, maxLengthWords, factCheck, extraInstructions } = options;

	return [
		buildSystemBlock(),
		buildTaskBlock(),
		buildPostBlock(postText),
		buildTakeBlock("caption", yourThoughts),
		buildToneBlock(emotion),
		buildWordLimitBlock(maxLengthWords),
		buildFactCheckBlock("caption", factCheck),
		buildExtraInstructionsBlock(extraInstructions),
		buildOutputBlock(),
	];
};

/**
 * Builds a prompt for an LLM to draft a repost caption. Shared writing rules come first,
 * then the task, the original post and the user's own take.
 */
export const buildLinkedInRepostPrompt = (options: RepostPromptOptions): string => joinSections(buildPromptParts(options));

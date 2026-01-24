import type { CommentPromptOptions } from "../lib";
import { SYSTEM_INSTRUCTIONS } from "./system-instructions";

/**
 * Builds a prompt for an LLM that sets a clear role,
 * provides context, and avoids typical AI signals.
 */
export const buildLinkedInCommentPrompt = (options: CommentPromptOptions): string => {
	const { postText, selectedComments, yourThoughts, emotion, maxLengthWords, extraInstructions } = options;

	const asFencedBlock = (label: string, content: string): string => {
		const body = content.trim() || "(empty)";
		return `## ${label}\n\n\
\`\`\`text\n${body}\n\`\`\``;
	};

	const joinSections = (sections: readonly string[]): string =>
		sections
			.map((section) => section.trim())
			.filter((section) => section.length > 0)
			.join("\n\n");

	// 1. Role and purpose — tell the model who it should be
	const roleBlock = joinSections([
		"## Role",
		"You are an experienced LinkedIn commentator known for thoughtful, natural, and engaging responses. Your task is to write a comment that sounds like a real human and reflects genuine insight and perspective.",
	]);

	const systemBlock = asFencedBlock("System instructions", SYSTEM_INSTRUCTIONS);

	// 2. Context — give the original post
	const postBlock = asFencedBlock("Post", postText);

	// 3. Reference comments — optionally include some to shape style
	const commentsBlock = selectedComments.length
		? joinSections(["## Reference comments", selectedComments.map((comment, index) => `- ${index + 1}. ${comment.trim()}`).join("\n")])
		: joinSections(["## Reference comments", "*(none)*"]);

	// 4. Your own position — anchor the output in your voice
	const thoughtsBlock = asFencedBlock("Your perspective", yourThoughts);

	// 5. Emotional tone — specify how it should *feel* (still human)
	const emotionBlock = joinSections([
		"## Tone",
		`The tone should convey a ${emotion} and authentic voice, not generic or formulaic. Avoid obvious AI cues or overly polished language.`,
	]);

	// 6. Format & length instructions
	const lengthBlock = maxLengthWords ? joinSections(["## Length", `Keep the comment under ${maxLengthWords} words.`]) : "";

	// 7. Extra instructions
	const extras = extraInstructions ? asFencedBlock("Extra instructions", extraInstructions) : "";

	// Build final prompt by combining blocks
	const promptParts = [
		systemBlock,
		roleBlock,
		postBlock,
		commentsBlock,
		thoughtsBlock,
		emotionBlock,
		lengthBlock,
		extras,
		joinSections(["## Output", "Write the final comment in a natural and human manner."]),
	];

	return joinSections(promptParts);
};

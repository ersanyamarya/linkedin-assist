import type { CommentPromptOptions } from "../lib";

/**
 * Builds a prompt for an LLM that sets a clear role,
 * provides context, and avoids typical AI signals.
 */
export function buildLinkedInCommentPrompt(options: CommentPromptOptions): string {
	const { postText, selectedComments, yourThoughts, emotion, maxLengthWords, extraInstructions } = options;

	// 1. Role and purpose — tell the model who it should be
	const roleBlock =
		"You are an experienced LinkedIn commentator known for thoughtful, natural, and engaging responses. Your task is to write a comment that sounds like a real human and reflects genuine insight and perspective.";

	// 2. Context — give the original post
	const postBlock = `Here is the LinkedIn post:\n${postText.trim()}`;

	// 3. Reference comments — optionally include some to shape style
	const commentsBlock = selectedComments.length
		? `These are sample comments from others that I think are relevant or useful:\n${selectedComments.map((c, i) => `${i + 1}. ${c.trim()}`).join("\n")}`
		: "";

	// 4. Your own position — anchor the output in your voice
	const thoughtsBlock = `My own perspective that I want to weave into the comment:\n${yourThoughts.trim()}`;

	// 5. Emotional tone — specify how it should *feel* (still human)
	const emotionBlock = `The tone should convey a ${emotion} and authentic voice, not generic or formulaic. Avoid obvious AI cues or overly polished language.`;

	// 6. Format & length instructions
	const lengthBlock = maxLengthWords ? `Keep the comment under ${maxLengthWords} words.` : "";

	// 7. Extra instructions
	const extras = extraInstructions ? `${extraInstructions.trim()}` : "";

	// Build final prompt by combining blocks
	const promptParts = [
		roleBlock,
		postBlock,
		commentsBlock,
		thoughtsBlock,
		emotionBlock,
		lengthBlock,
		extras,
		"Write the final comment in a natural and human manner.",
	];

	return promptParts.filter((p) => p && p.trim().length > 0).join("\n\n");
}

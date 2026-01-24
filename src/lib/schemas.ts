import { z } from "zod";

/**
 * A post and its visible comments, extracted from LinkedIn's feed or single-post page.
 */
export const PostCommentsSchema = z
	.object({
		postText: z.string(),
		comments: z.array(z.string()),
	})
	.strict();

export type PostComments = z.infer<typeof PostCommentsSchema>;

/**
 * A single message event in a messaging thread.
 */
export const MessageSchema = z
	.object({
		sender: z.string(),
		text: z.string(),
	})
	.strict();

export type Message = z.infer<typeof MessageSchema>;

/**
 * Messaging thread extraction output.
 */
export const MessagesSchema = z
	.object({
		senderName: z.string(),
		messages: z.array(MessageSchema),
	})
	.strict();

export type Messages = z.infer<typeof MessagesSchema>;

export const ALLOWED_EMOTIONS = ["confident", "thoughtful", "inquisitive", "supportive", "optimistic", "critical", "neutral"] as const;

export const EmotionsSchema = z.enum(ALLOWED_EMOTIONS);
export type Emotion = z.infer<typeof EmotionsSchema>;

export const CommentPromptOptionsSchema = z
	.object({
		postText: z.string(),
		selectedComments: z.array(z.string()),
		yourThoughts: z.string(),
		emotion: EmotionsSchema,
		maxLengthWords: z.number().optional(),
		extraInstructions: z.string().optional(),
	})
	.strict();

export type CommentPromptOptions = z.infer<typeof CommentPromptOptionsSchema>;

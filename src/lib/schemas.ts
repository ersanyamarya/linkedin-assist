import { z } from "zod";

// Zod probes for `new Function()` to JIT-compile object parsers. MV3 content scripts forbid eval,
// so the probe trips a CSP violation that Chrome reports as an extension error. Skip the JIT.
z.config({ jitless: true });

/**
 * A post and its visible comments, extracted from LinkedIn's feed or single-post page.
 */
export const PostCommentsSchema = z
	.object({
		postText: z.string(),
		comments: z.array(z.string()),
	})
	.strict();

/**
 * A post being reposted, extracted from LinkedIn's feed or single-post page.
 */
export const RepostSchema = z
	.object({
		postText: z.string(),
	})
	.strict();

/**
 * A visited member's profile, extracted from their LinkedIn profile page.
 */
export const ProfileSchema = z
	.object({
		name: z.string(),
		headline: z.string(),
		location: z.string(),
		about: z.string(),
		experience: z.string(),
		education: z.string(),
		skills: z.string(),
		recentActivity: z.array(z.string()),
	})
	.strict();

export type Profile = z.infer<typeof ProfileSchema>;

/**
 * A single message event in a messaging thread.
 */
const MessageSchema = z
	.object({
		sender: z.string(),
		text: z.string(),
	})
	.strict();

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

const EmotionsSchema = z.enum(ALLOWED_EMOTIONS);
export type Emotion = z.infer<typeof EmotionsSchema>;

export const CommentPromptOptionsSchema = z
	.object({
		postText: z.string(),
		/** The comment being answered, when the editor is a reply box under a comment. */
		replyTo: z.string().optional(),
		selectedComments: z.array(z.string()),
		yourThoughts: z.string(),
		emotion: EmotionsSchema,
		maxLengthWords: z.number().optional(),
		factCheck: z.boolean().optional(),
		extraInstructions: z.string().optional(),
		voiceSamples: z.array(z.string()).optional(),
	})
	.strict();

export type CommentPromptOptions = z.infer<typeof CommentPromptOptionsSchema>;

export const RepostPromptOptionsSchema = z
	.object({
		postText: z.string(),
		yourThoughts: z.string(),
		emotion: EmotionsSchema,
		maxLengthWords: z.number().optional(),
		factCheck: z.boolean().optional(),
		extraInstructions: z.string().optional(),
		voiceSamples: z.array(z.string()).optional(),
	})
	.strict();

export type RepostPromptOptions = z.infer<typeof RepostPromptOptionsSchema>;

/** LinkedIn caps a connection note at 200 characters, or 300 with Premium. */
export const CONNECTION_NOTE_LIMITS = [200, 300] as const;

export const ConnectionNotePromptOptionsSchema = z
	.object({
		profile: ProfileSchema,
		yourThoughts: z.string(),
		emotion: EmotionsSchema,
		maxChars: z.number(),
		extraInstructions: z.string().optional(),
		voiceSamples: z.array(z.string()).optional(),
	})
	.strict();

export type ConnectionNotePromptOptions = z.infer<typeof ConnectionNotePromptOptionsSchema>;

export const ALLOWED_TONES = ["friendly", "professional", "casual", "direct", "warm"] as const;
const TonesSchema = z.enum(ALLOWED_TONES);
export type Tone = z.infer<typeof TonesSchema>;

export const ALLOWED_LENGTHS = ["short", "medium", "long"] as const;
const LengthsSchema = z.enum(ALLOWED_LENGTHS);
export type Length = z.infer<typeof LengthsSchema>;

export const ALLOWED_INTENTS = ["reply", "follow-up", "close", "qualify-lead"] as const;
const IntentsSchema = z.enum(ALLOWED_INTENTS);
export type Intent = z.infer<typeof IntentsSchema>;

export const ALLOWED_FORMALITIES = ["low", "medium", "high"] as const;
const FormalitiesSchema = z.enum(ALLOWED_FORMALITIES);
export type Formality = z.infer<typeof FormalitiesSchema>;

const MessagePromptOptionsSchema = z
	.object({
		currentUserName: z.string().optional(),
		recipientName: z.string().optional(),
		tone: TonesSchema.optional(),
		length: LengthsSchema.optional(),
		intent: IntentsSchema.optional(),
		formality: FormalitiesSchema.optional(),
		includeCTA: z.boolean().optional(),
		extraInstructions: z.string().optional(),
		voiceSamples: z.array(z.string()).optional(),
	})
	.strict();

export type MessagePromptOptions = z.infer<typeof MessagePromptOptionsSchema>;

/**
 * Local checks for text that still sounds machine-written. Runs on a generated answer in the
 * browser; nothing is sent anywhere. `BANNED_WORDS` also feeds the writing rules in the prompt,
 * so the prompt and the check can't drift apart.
 */

export const BANNED_WORDS = [
	"delve",
	"foster",
	"leverage",
	"utilize",
	"facilitate",
	"empower",
	"streamline",
	"robust",
	"cutting-edge",
	"game changer",
	"paradigm shift",
	"tapestry",
	"realm",
	"beacon",
	"landscape",
	"multifaceted",
	"meticulous",
	"intricate",
	"paramount",
	"pivotal",
	"crucial",
	"transformative",
	"elevate",
	"embark",
	"supercharge",
	"harness",
	"ever-evolving",
	"enhance",
	"garner",
	"interplay",
	"showcase",
	"testament",
	"underscore",
	"vibrant",
] as const;

export type SlopIssue = {
	/** Short description shown to the user, e.g. "2 em dashes". */
	label: string;
	/** Whether `fixPunctuation` removes it. */
	fixable: boolean;
};

const DASHES = /[—–]/g;
const NUMERIC_RANGE_DASH = /(\d)[—–](\d)/g;
const DASH_WITH_SPACES = /\s*[—–]\s*/g;
const CURLY_QUOTE = /[“”‘’]/;
const CURLY_DOUBLE = /[“”]/g;
const CURLY_SINGLE = /[‘’]/g;
const HASHTAG = /(^|\s)#\w+/g;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BANNED_WORD_PATTERN = new RegExp(`\\b(?:${BANNED_WORDS.map(escapeRegExp).join("|")})\\w*`, "gi");

// Phrases that give a text away on their own. Each entry is reported once, by `label`.
const PHRASE_CHECKS: readonly { label: string; pattern: RegExp }[] = [
	{ label: "generic opener", pattern: /^\W*(great|excellent|fantastic|awesome|amazing|love this|so true|absolutely|well said)\b/i },
	{ label: '"I\'m thrilled/excited to"', pattern: /\bi['’]?m (so )?(thrilled|excited|delighted|humbled)\b/i },
	{ label: "faux insight", pattern: /\b(here['’]?s the thing|what most people miss|let me be clear|it['’]?s important to note)\b/i },
	{ label: "\"it's not X, it's Y\"", pattern: /\bit['’]?s not (just |only )?[^.!?\n]{1,60}?[,;]? (but )?it['’]?s\b/i },
	{ label: "chatbot closer", pattern: /\b(i hope this helps|in conclusion|ultimately)\b/i },
];

const countMatches = (text: string, pattern: RegExp): number => text.match(pattern)?.length ?? 0;
const plural = (count: number, noun: string, suffix = "s"): string => `${count} ${noun}${count === 1 ? "" : suffix}`;

const dashIssues = (text: string): SlopIssue[] => {
	const dashes = countMatches(text, DASHES);
	return dashes ? [{ label: plural(dashes, "em/en dash", "es"), fixable: true }] : [];
};

const quoteIssues = (text: string): SlopIssue[] => (CURLY_QUOTE.test(text) ? [{ label: "curly quotes", fixable: true }] : []);

const wordIssues = (text: string): SlopIssue[] => {
	const words = new Set((text.match(BANNED_WORD_PATTERN) ?? []).map((word) => word.toLowerCase()));
	if (!words.size) return [];
	return [{ label: `AI-flavoured ${words.size === 1 ? "word" : "words"}: ${[...words].join(", ")}`, fixable: false }];
};

const phraseIssues = (text: string): SlopIssue[] => PHRASE_CHECKS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => ({ label, fixable: false }));

const hashtagIssues = (text: string): SlopIssue[] => {
	const hashtags = countMatches(text, HASHTAG);
	return hashtags ? [{ label: plural(hashtags, "hashtag"), fixable: false }] : [];
};

/** Run in this order, which is the order issues are listed to the user. */
const SLOP_CHECKS: readonly ((text: string) => SlopIssue[])[] = [dashIssues, quoteIssues, wordIssues, phraseIssues, hashtagIssues];

/** What in `text` reads as AI-written. Empty when nothing stands out. */
export const findSlop = (text: string): SlopIssue[] => SLOP_CHECKS.flatMap((check) => check(text));

/** Replaces em/en dashes with commas and curly quotes with straight ones. Numeric ranges keep a hyphen. */
export const fixPunctuation = (text: string): string =>
	text.replace(NUMERIC_RANGE_DASH, "$1-$2").replace(DASH_WITH_SPACES, ", ").replace(CURLY_DOUBLE, '"').replace(CURLY_SINGLE, "'");

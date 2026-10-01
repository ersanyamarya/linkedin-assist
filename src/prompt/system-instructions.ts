import { BANNED_WORDS } from "../lib";
import { asFencedBlock, joinSections } from "./prompt-utils";

// Shared writing rules for every prompt. Condensed from `.claude/skills/humanize-and-unslop/SKILL.md`
// (generation rules only; the skill's edit/detect modes and output format are left out).

/** How the text should sound. Only for text the user posts or sends as themselves. */
const VOICE_RULES = `Write like a real person typing on LinkedIn, not like an AI assistant.

### Voice
- Have a point of view. React to the content instead of neutrally listing pros and cons.
- Be specific. Concrete details, names and numbers beat abstract claims.
- Vary sentence length. Some short. Some longer ones that take their time.
- First person ("I", "we") is fine. Pick plain words over impressive ones.
- Keep it a little loose. Perfectly symmetrical structure reads as machine-made.`;

/** Punctuation, wording and pattern rules that apply to every prompt. */
const CORE_RULES = `### Punctuation and formatting
- No em dashes or en dashes. Use a period or a comma instead.
- No colon as a dramatic setup ("The result: a faster app"). Just write the sentence.
- Use straight quotes (" and '), never curly quotes.
- No emojis unless the extra instructions ask for them.
- No bold, headings or bullet lists unless the output section asks for them.

### Banned words
${BANNED_WORDS.join(", ")}.

### Patterns to avoid
- Puffery like "stands as a testament" or "plays a vital role". State the fact.
- Fancy ways to say "is", like "serves as", "stands as", "boasts". Say "is" or "has".
- "It's not X, it's Y" contrasts. Just say Y.
- Forced groups of three. Use the natural number of items.
- Trailing -ing phrases like "highlighting..." or "showcasing...".
- Faux insight like "What most people miss" or "Here's the thing".
- Throat-clearing like "It's important to note" or "Let me be clear".
- Vague attribution like "experts agree" or "many argue". Name the source or cut it.
- Synonym cycling. Pick one word for a thing and reuse it.
- Chatbot openers and closers like "Great point!", "Absolutely!", "I hope this helps", "In conclusion", "Ultimately". End on the last concrete point.

Before answering, reread your draft and fix anything that still sounds AI-generated. Output only the final text.`;

/** The user's own writing, fenced, so the model matches their rhythm and word choice. Omitted when there are none. */
const buildVoiceSamplesBlock = (samples: readonly string[] | undefined): string =>
	samples?.length
		? joinSections([
				asFencedBlock("My writing samples", samples.map((sample, index) => `${index + 1}. ${sample}`).join("\n\n")),
				"Match the voice of these samples: sentence length, word choice, how formal or loose they are. Don't copy their content or phrases.",
			])
		: "";

/**
 * Writing rules as a plain section (not fenced, so the model reads them as instructions, not input).
 * Pass `{ voice: false }` for factual output such as the profile summary. `voiceSamples` are the
 * user's own past writing, added so the output sounds like them.
 */
export const buildSystemBlock = ({ voice = true, voiceSamples }: { voice?: boolean; voiceSamples?: readonly string[] } = {}): string =>
	joinSections(["## Writing rules", voice ? VOICE_RULES : "", CORE_RULES, voice ? buildVoiceSamplesBlock(voiceSamples) : ""]);

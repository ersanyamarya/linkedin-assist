import { asFencedBlock, joinSections } from "./prompt-utils";

/** One-click rewrites offered under a generated answer. `instruction` is what the model is told to change. */
export const REFINEMENTS = [
	{ label: "Shorter", instruction: "Make it noticeably shorter. Cut anything that isn't essential." },
	{ label: "More casual", instruction: "Make it more casual and conversational, like talking to a colleague." },
	{ label: "More direct", instruction: "Make it more direct. Lead with the point and drop the softening." },
	{ label: "Add a question", instruction: "End with one specific, genuine question that invites a reply." },
	{ label: "More specific", instruction: "Make it more specific. Swap vague claims for a concrete detail, example or number from the input." },
] as const;

/**
 * Asks the model to revise an earlier answer. The original prompt stays in so the writing rules,
 * the input and the output format still apply; only the requested change is new.
 */
export const buildRefinePrompt = (originalPrompt: string, draft: string, instruction: string): string =>
	joinSections([
		originalPrompt,
		asFencedBlock("Previous draft", draft),
		joinSections([
			"## Revision",
			`Rewrite the previous draft with one change: ${instruction} Keep everything else, including the facts and the writing rules above. Output only the new text.`,
		]),
	]);

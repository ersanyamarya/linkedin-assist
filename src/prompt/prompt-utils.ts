export const asFencedBlock = (label: string, content: string): string => {
	const body = content.trim() || "(empty)";
	return `## ${label}\n
\`\`\`\n${body}\n\`\`\``;
};

export const joinSections = (sections: readonly string[]): string =>
	sections
		.map((section) => section.trim())
		.filter((section) => section.length > 0)
		.join("\n\n");

/** The user's own take, fenced. Omitted when empty. `subject` names the output, e.g. "comment". */
export const buildTakeBlock = (subject: string, yourThoughts: string): string =>
	yourThoughts.trim() ? asFencedBlock(`My take (build the ${subject} around this, it matters most)`, yourThoughts) : "";

/** One-word tone, e.g. "Inquisitive.". Omitted when unset. */
export const buildToneBlock = (tone: string | undefined): string => (tone ? joinSections(["## Tone", `${tone.charAt(0).toUpperCase()}${tone.slice(1)}.`]) : "");

export const buildWordLimitBlock = (maxLengthWords: number | undefined): string =>
	maxLengthWords ? joinSections(["## Length", `Under ${maxLengthWords} words.`]) : "";

export const buildFactCheckBlock = (subject: string, factCheck: boolean | undefined): string =>
	factCheck ? joinSections(["## Fact check", `If you can, do a quick internet check on the topic so the ${subject} stays accurate.`]) : "";

export const buildExtraInstructionsBlock = (extraInstructions: string | undefined): string =>
	extraInstructions?.trim() ? asFencedBlock("Extra instructions", extraInstructions) : "";

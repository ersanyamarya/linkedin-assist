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

import type { Profile } from "../lib";
import { asFencedBlock, joinSections } from "./prompt-utils";
import { buildSystemBlock } from "./system-instructions";

const buildRoleBlock = (): string =>
	joinSections([
		"## Role",
		"You are a sharp research assistant who reads LinkedIn profiles and briefs people before they reach out, meet, or interview someone. Your task is to turn the raw profile data below into a brief, accurate profile of this person.",
	]);

const buildListBlock = (label: string, items: readonly string[]): string => asFencedBlock(label, items.map((item) => `• ${item}`).join("\n\n"));

const buildProfileBlocks = (profile: Profile): readonly string[] => [
	asFencedBlock("Name", profile.name),
	asFencedBlock("Headline", profile.headline),
	asFencedBlock("Location", profile.location),
	asFencedBlock("About / summary", profile.about),
	asFencedBlock("Experience", profile.experience),
	asFencedBlock("Education", profile.education),
	asFencedBlock("Skills (only the top few shown on the profile)", profile.skills),
	buildListBlock("Recent posts", profile.recentActivity),
];

const buildOutputBlock = (): string =>
	joinSections([
		"## Output",
		[
			"Write a brief profile with these sections:",
			"1. **Snapshot**: one or two sentences on who they are and what they do now.",
			"2. **Career path**: the arc of their experience, key roles, and how long they have spent in each area.",
			"3. **Expertise**: the skills and domains they are strongest in, based on their experience and skills.",
			"4. **Education**: degrees and institutions, in one line if possible.",
			"5. **What they care about right now**: themes from their recent activity and about section.",
			"6. **Conversation starters**: two or three specific, non-generic openers based on the above.",
			"",
			"Use only the information provided. If a section has no data, say so in one line instead of guessing. Keep the whole profile under 250 words.",
		].join("\n"),
	]);

/**
 * Builds a prompt for an LLM that turns extracted LinkedIn profile data
 * into a brief, skimmable profile of the person.
 */
export const buildProfileSummaryPrompt = (profile: Profile): string =>
	joinSections([buildSystemBlock({ voice: false }), buildRoleBlock(), ...buildProfileBlocks(profile), buildOutputBlock()]);

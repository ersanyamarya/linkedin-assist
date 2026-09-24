import { DOM, ProfileSchema, UI } from "../lib";
import { buildProfileSummaryPrompt } from "../prompt";
import { createTextModal } from "../ui";

// Main profile page only (e.g. /in/jane-doe/), not sub-pages like /in/jane-doe/details/experience/.
const PROFILE_PATH_PATTERN = /^\/in\/[^/]+\/?$/;

// Visible <h2> text of each profile section. "Skills" renders as "Skills (50)", so matching is by prefix.
const SECTION_HEADINGS = {
	about: "About",
	experience: "Experience",
	education: "Education",
	skills: "Skills",
	activity: "Activity",
} as const;

// Lines inside sections that are controls, counters, or post chrome rather than profile information.
const NOISE_PATTERN =
	/^(show all.*|show more|see more|…\s*more|show credential|endorse|follow|following|message|connect|more|•|·|contact info|(linkedin )?helped me get this job|\d+ endorsements?|\d[\d,]* (followers|reactions?|comments?|reposts?).*)$/i;

// Pronoun lines ("She/Her") and connection-degree lines ("· 1st") in the top card.
const TOP_CARD_META_PATTERN = /^(·|(she|he|they)\/\w+)/i;

// Notification count LinkedIn prefixes to the title, e.g. "(3) Jane Doe | LinkedIn".
const TITLE_NOTIFICATION_PREFIX = /^\(\d+\)\s*/;
// "… more" toggle label that trails a clamped post body.
const MORE_TOGGLE_SUFFIX = /…\s*more$/;

const CONTACT_INFO_LABEL = "Contact info";
const MAX_ACTIVITY_ITEMS = 5;
const MAX_POST_LENGTH = 800;
const LAZY_LOAD_STEP_PX = 700;
const LAZY_LOAD_STEP_MS = 250;
const LAZY_LOAD_MAX_STEPS = 30;

const normalizeWhitespace = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();

const isProfilePage = (): boolean => PROFILE_PATH_PATTERN.test(location.pathname);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Tries each selector in order; returns the first element found.
const queryFirst = (selectors: readonly string[]): Element | null => {
	for (const selector of selectors) {
		const el = document.querySelector(selector);
		if (el) return el;
	}
	return null;
};

/**
 * Experience, Education, Skills and the rest only render once scrolled into view, and the profile
 * scrolls inside <main> rather than the window. Scroll to the bottom in steps so every section
 * mounts, then restore the reader's position. Sections stay mounted after scrolling away.
 */
const loadLazySections = async () => {
	const scroller = document.querySelector<HTMLElement>(DOM.SELECTORS.PROFILE_SCROLL_CONTAINER) ?? document.scrollingElement;
	if (!scroller) return;

	const startTop = scroller.scrollTop;
	for (let step = 0; step < LAZY_LOAD_MAX_STEPS; step++) {
		const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
		if (atBottom) break;
		scroller.scrollBy(0, LAZY_LOAD_STEP_PX);
		await wait(LAZY_LOAD_STEP_MS);
	}
	scroller.scrollTo(0, startTop);
};

// LinkedIn's <title> is "{name} | LinkedIn" on profile pages.
const getProfileName = (): string => normalizeWhitespace(document.title.replace(TITLE_NOTIFICATION_PREFIX, "").split(" | ")[0]);

const getSectionHeading = (section: Element): string => normalizeWhitespace(section.querySelector(DOM.SELECTORS.PROFILE_SECTION_HEADING)?.textContent);

/**
 * Sections nest (an outer wrapper can share its first <h2> with an inner card), so the last,
 * innermost section with a matching heading is the card itself.
 */
const findSection = (heading: string): HTMLElement | undefined =>
	Array.from(document.querySelectorAll<HTMLElement>(DOM.SELECTORS.PROFILE_SECTION))
		.filter((section) => getSectionHeading(section).startsWith(heading))
		.at(-1);

/** The section's visible lines, minus its heading, control labels, and consecutive duplicates. */
const getSectionLines = (section: HTMLElement | undefined): string[] => {
	if (!section) return [];
	const lines = section.innerText.split("\n").map(normalizeWhitespace).filter(Boolean).slice(1);
	return lines.filter((line, i) => !NOISE_PATTERN.test(line) && line !== lines[i - 1]);
};

const getSectionText = (heading: string): string => getSectionLines(findSection(heading)).join("\n");

/**
 * The top card lists: name, pronouns, degree, headline, current company, location, "·", "Contact info", …
 * The headline is the first line that isn't the name or top-card metadata; the location is the
 * last real line before "Contact info".
 */
const getTopCardDetails = (name: string): { headline: string; location: string } => {
	const topCard = findSection(name);
	const lines = topCard ? Array.from(topCard.querySelectorAll("p")).map((p) => normalizeWhitespace(p.textContent)) : [];
	const details = lines.filter((line) => line.length > 0 && line !== name && !TOP_CARD_META_PATTERN.test(line));

	const contactIndex = details.indexOf(CONTACT_INFO_LABEL);
	return {
		headline: details[0] ?? "",
		location: contactIndex > 0 ? (details[contactIndex - 1] ?? "") : "",
	};
};

const truncate = (text: string): string => (text.length > MAX_POST_LENGTH ? `${text.slice(0, MAX_POST_LENGTH)}…` : text);

// Each post in the Activity carousel keeps its body in the shared expandable-text-box component.
const getRecentPosts = (): string[] => {
	const activity = findSection(SECTION_HEADINGS.activity);
	if (!activity) return [];
	return Array.from(activity.querySelectorAll(DOM.SELECTORS.EXPANDABLE_TEXT_BOX))
		.map((box) => truncate(normalizeWhitespace(box.textContent).replace(MORE_TOGGLE_SUFFIX, "")))
		.filter((text) => text.length > 0)
		.slice(0, MAX_ACTIVITY_ITEMS);
};

const buildProfileSnapshot = () => {
	const name = getProfileName();
	return {
		name,
		...getTopCardDetails(name),
		about: getSectionText(SECTION_HEADINGS.about),
		experience: getSectionText(SECTION_HEADINGS.experience),
		education: getSectionText(SECTION_HEADINGS.education),
		skills: getSectionText(SECTION_HEADINGS.skills),
		recentActivity: getRecentPosts(),
	};
};

const openProfilePromptModal = async (button: HTMLButtonElement) => {
	button.disabled = true;
	try {
		await loadLazySections();
	} finally {
		button.disabled = false;
	}

	const snapshot = buildProfileSnapshot();
	if (!(snapshot.name || snapshot.headline)) {
		alert("Could not extract profile details.");
		return;
	}

	const parsed = ProfileSchema.safeParse(snapshot);
	if (!parsed.success) {
		console.warn("LinkedIn Assist profile schema validation failed:", { issues: parsed.error.issues, snapshot });
		alert("Extracted profile data could not be validated.");
		return;
	}

	console.log("LinkedIn Assist extracted from profile:", parsed.data);
	createTextModal(buildProfileSummaryPrompt(parsed.data), "Profile Summary Prompt");
};

const createIdeaButton = (): HTMLButtonElement => {
	const button = document.createElement("button");
	button.classList.add(UI.CLASSES.IDEA_BUTTON);
	button.type = "button";
	button.title = UI.TEXT.PROFILE_IDEA_BUTTON;
	button.setAttribute("aria-label", UI.TEXT.PROFILE_IDEA_BUTTON);
	button.setAttribute(DOM.ATTR.DATA_PROFILE_IDEA, "true");
	button.innerHTML = UI.SVG.IDEA;
	button.addEventListener("click", () => openProfilePromptModal(button));
	return button;
};

const MAX_ACTION_ROW_DEPTH = 6;

/**
 * Walks up from one action button (Message, Connect, …) until reaching the wrapper that sits
 * directly in the action row, i.e. whose parent also holds a sibling button. The idea button
 * is inserted after that wrapper so it lays out in the row like the other actions.
 */
const findActionRowItem = (actionButton: Element): Element => {
	let item = actionButton;
	for (let depth = 0; depth < MAX_ACTION_ROW_DEPTH && item.parentElement; depth++) {
		const row = item.parentElement;
		const hasSiblingAction = Array.from(row.children).some((child) => child !== item && child.matches("button, a, :has(button)"));
		if (hasSiblingAction) return item;
		item = row;
	}
	return actionButton;
};

/**
 * Places the idea button in the profile's action row (Message / Connect / More).
 * Falls back to sitting next to the name when the action row can't be found.
 */
const attachIdeaButton = () => {
	if (document.querySelector(`.${UI.CLASSES.IDEA_BUTTON}[${DOM.ATTR.DATA_PROFILE_IDEA}]`)) return;

	const actions = queryFirst(DOM.SELECTORS.PROFILE_ACTIONS_SELECTORS);
	const actionButton = actions ? null : queryFirst(DOM.SELECTORS.PROFILE_ACTION_BUTTON_FALLBACKS);
	const nameHeading = findSection(getProfileName())?.querySelector(DOM.SELECTORS.PROFILE_SECTION_HEADING);

	if (actions) actions.append(createIdeaButton());
	else if (actionButton) findActionRowItem(actionButton).insertAdjacentElement("afterend", createIdeaButton());
	else if (nameHeading) nameHeading.insertAdjacentElement("afterend", createIdeaButton());
};

// LinkedIn is a single-page app, so this script runs on every page and checks the path on each
// DOM change; the button appears whenever the user navigates to a profile.
const observer = new MutationObserver(() => {
	if (isProfilePage()) attachIdeaButton();
});

observer.observe(document.body, { childList: true, subtree: true });

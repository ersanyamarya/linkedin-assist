import { DOM, normalizeWhitespace } from "../lib";
import { createIdeaButton, createTextModal } from "../ui";

// Tries each selector in order; returns the first element found.
const queryFirst = (selectors: readonly string[]): Element | null => {
	for (const selector of selectors) {
		const el = document.querySelector(selector);
		if (el) return el;
	}
	return null;
};

const findSaveButtons = (): Element[] =>
	DOM.SELECTORS.JOB_SAVE_BUTTON_FALLBACKS.flatMap((selector) =>
		Array.from(document.querySelectorAll(selector)).filter((el) => !el.hasAttribute(DOM.ATTR.DATA_JOB_IDEA))
	).filter((el, i, arr) => arr.indexOf(el) === i); // deduplicate

const observer = new MutationObserver(() => {
	for (const saveButton of findSaveButtons()) {
		attachIdeaButton(saveButton);
	}
});

observer.observe(document.body, { childList: true, subtree: true });

const getTextFromSelectors = (selectors: readonly string[]): string => normalizeWhitespace(queryFirst(selectors)?.textContent);

const getPreferenceText = (): string => {
	const buttons = Array.from(document.querySelectorAll(DOM.SELECTORS.JOB_PREFERENCES));
	return buttons
		.map((button) => normalizeWhitespace(button.textContent))
		.filter((text) => text.length > 0)
		.join(" · ");
};

const getJobDescriptionBody = (): string => {
	const element = queryFirst(DOM.SELECTORS.JOB_DESCRIPTION_BODY_SELECTORS);
	if (element) return ((element as HTMLElement).innerText ?? element.textContent ?? "").trim();

	// Structural fallback: LinkedIn sometimes serves the job page with none of the classnames
	// above (no stable hooks at all beyond the generic rich-text component's test id).
	const textBoxes = Array.from(document.querySelectorAll(DOM.SELECTORS.EXPANDABLE_TEXT_BOX));
	return textBoxes
		.map((el) => normalizeWhitespace((el as HTMLElement).innerText ?? el.textContent))
		.filter((text) => text.length > 0)
		.join("\n\n");
};

/**
 * LinkedIn's <title> reliably follows "{job title} | {company} | LinkedIn", even on job page
 * variants that expose no other stable hooks for the title/company. Used only as a fallback
 * when the DOM-based selectors above find nothing.
 */
const parseTitleAndCompanyFromDocumentTitle = (): { title: string; company: string } => {
	const parts = document.title.split(" | ").map(normalizeWhitespace);
	if (parts.length < 3 || parts.at(-1) !== "LinkedIn") return { title: "", company: "" };

	const company = parts.at(-2) ?? "";
	const title = parts.slice(0, -2).join(" | ");
	return { title, company };
};

const buildJobSnapshot = () => {
	const fallback = parseTitleAndCompanyFromDocumentTitle();
	const title = getTextFromSelectors(DOM.SELECTORS.JOB_TITLE_SELECTORS) || fallback.title;
	const company = getTextFromSelectors(DOM.SELECTORS.JOB_COMPANY_NAME_SELECTORS) || fallback.company;
	const details = getTextFromSelectors(DOM.SELECTORS.JOB_PRIMARY_DESCRIPTION_SELECTORS);
	const preferences = getPreferenceText();
	const description = getJobDescriptionBody();

	return {
		metadata: { title, company, details, preferences },
		description,
	};
};

const showJobModal = () => {
	const snapshot = buildJobSnapshot();
	createTextModal(JSON.stringify(snapshot, null, 2), "Job details", "The details read from this job posting.");
};

/**
 * Finds the element to insert the idea button after.
 * LinkedIn sometimes wraps the save button in a `display: grid` container sized for its
 * existing children only; adding a sibling there makes the grid overlap it on top of the
 * save button instead of laying out beside it. Walk out of any such grid ancestor so the
 * idea button renders in normal flow next to the button group instead of inside it.
 */
const findInsertionAnchor = (saveButton: HTMLElement): Element => {
	let anchor: Element = saveButton;
	let parent = anchor.parentElement;
	while (parent && getComputedStyle(parent).display === "grid") {
		anchor = parent;
		parent = anchor.parentElement;
	}
	return anchor;
};

const attachIdeaButton = (saveButton: Element) => {
	if (!(saveButton instanceof HTMLElement)) return;
	if (saveButton.hasAttribute(DOM.ATTR.DATA_JOB_IDEA)) return;

	saveButton.setAttribute(DOM.ATTR.DATA_JOB_IDEA, "true");
	const ideaButton = createIdeaButton(showJobModal, "Generate an idea for this job");
	findInsertionAnchor(saveButton).insertAdjacentElement("afterend", ideaButton);
};

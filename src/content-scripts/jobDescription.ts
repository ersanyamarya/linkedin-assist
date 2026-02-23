import { DOM, UI } from "../lib";
import { createTextModal } from "../ui";

const observer = new MutationObserver(() => {
	const saveButtons = Array.from(document.querySelectorAll(DOM.SELECTORS.JOB_SAVE_BUTTON)).filter((button) => !button.hasAttribute(DOM.ATTR.DATA_JOB_IDEA));

	for (const saveButton of saveButtons) {
		attachIdeaButton(saveButton);
	}
});

observer.observe(document.body, { childList: true, subtree: true });

const normalizeWhitespace = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();

const getTextContent = (selector: string): string => {
	const element = document.querySelector(selector);
	return normalizeWhitespace(element?.textContent);
};

const getPreferenceText = (): string => {
	const buttons = Array.from(document.querySelectorAll(DOM.SELECTORS.JOB_PREFERENCES));
	return buttons
		.map((button) => normalizeWhitespace(button.textContent))
		.filter((text) => text.length > 0)
		.join(" · ");
};

const getJobDescriptionBody = (): string => {
	const element = document.querySelector(DOM.SELECTORS.JOB_DESCRIPTION_BODY) ?? document.querySelector(DOM.SELECTORS.JOB_DESCRIPTION_BODY_FALLBACK);
	if (!element) return "";

	const text = (element as HTMLElement).innerText ?? element.textContent ?? "";
	return text.trim();
};

// const buildMetadataSection = (items: ReadonlyArray<{ label: string; value: string }>): string => {
// 	const lines = items.map((item) => (item.value ? `${item.label}: ${item.value}` : "")).filter((line) => line.length > 0);

// 	if (lines.length === 0) return "";
// 	return `Metadata:\n${lines.join("\n")}`;
// };

const buildJobSnapshot = () => {
	const title = getTextContent(DOM.SELECTORS.JOB_TITLE);
	const company = getTextContent(DOM.SELECTORS.JOB_COMPANY_NAME);
	const details = getTextContent(DOM.SELECTORS.JOB_PRIMARY_DESCRIPTION);
	const preferences = getPreferenceText();
	const description = getJobDescriptionBody();

	// const metadata = buildMetadataSection([
	// 	{ label: "Title", value: title },
	// 	{ label: "Company", value: company },
	// 	{ label: "Details", value: details },
	// 	{ label: "Preferences", value: preferences },
	// ]);

	return {
		metadata: {
			title,
			company,
			details,
			preferences,
		},
		description,
	};
};

const createIdeaButton = (onClick: () => void): HTMLButtonElement => {
	const button = document.createElement("button");
	button.classList.add(...UI.CLASSES.BUTTON_DEFAULTS, UI.CLASSES.IDEA_BUTTON);
	button.type = "button";
	button.innerHTML = UI.SVG.IDEA;
	button.addEventListener("click", onClick);
	return button;
};

const showJobModal = () => {
	const snapshot = buildJobSnapshot();
	if (!snapshot) {
		alert("Could not extract job details.");
		return;
	}
	// const sections = [snapshot.metadata, snapshot.description ? `Description:\n${snapshot.description}` : ""].filter((section) => section.length > 0);
	// const snapshotText = sections.join("\n\n");

	createTextModal(JSON.stringify(snapshot, null, 2));
};

const attachIdeaButton = (saveButton: Element) => {
	if (!(saveButton instanceof HTMLElement)) return;
	if (saveButton.hasAttribute(DOM.ATTR.DATA_JOB_IDEA)) return;

	saveButton.setAttribute(DOM.ATTR.DATA_JOB_IDEA, "true");
	const ideaButton = createIdeaButton(showJobModal);
	saveButton.insertAdjacentElement("afterend", ideaButton);
};

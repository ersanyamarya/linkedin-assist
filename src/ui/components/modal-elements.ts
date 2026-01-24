import { UI } from "../../lib";

/**
 * Creates the modal backdrop that closes when clicking outside the modal.
 */
export const createModalBackdrop = (onClose: () => void): HTMLDivElement => {
	const backdrop = document.createElement("div");
	backdrop.className = UI.CLASSES.MODAL_BACKDROP;
	backdrop.addEventListener("click", (event) => {
		if (event.target === backdrop) {
			onClose();
		}
	});
	return backdrop;
};

/**
 * Creates the base modal container element.
 */
export const createModalContainer = (): HTMLDivElement => {
	const modal = document.createElement("div");
	modal.className = UI.CLASSES.MODAL;
	return modal;
};

/**
 * Creates a labeled modal section with an optional hint.
 */
export const createSection = (labelText: string, field: HTMLElement, hintText?: string): HTMLDivElement => {
	const section = document.createElement("div");
	section.className = UI.CLASSES.MODAL_SECTION;

	const label = document.createElement("label");
	label.className = UI.CLASSES.MODAL_LABEL;
	label.textContent = labelText;

	section.appendChild(label);
	section.appendChild(field);

	if (hintText) {
		const hint = document.createElement("div");
		hint.className = UI.CLASSES.MODAL_HINT;
		hint.textContent = hintText;
		section.appendChild(hint);
	}

	return section;
};

/**
 * Creates a textarea styled for modal usage.
 */
export const createTextArea = (value: string, readonly = false): HTMLTextAreaElement => {
	const textarea = document.createElement("textarea");
	textarea.className = UI.CLASSES.MODAL_TEXTAREA;
	textarea.value = value;
	textarea.readOnly = readonly;
	return textarea;
};

/**
 * Creates a standard modal input field.
 */
export const createInput = (type: string, placeholder: string, value = ""): HTMLInputElement => {
	const input = document.createElement("input");
	input.className = UI.CLASSES.MODAL_INPUT;
	input.type = type;
	input.placeholder = placeholder;
	input.value = value;
	return input;
};

/**
 * Creates a select field with the provided options and optional selected value.
 */
export const createSelect = (values: readonly string[], selectedValue?: string): HTMLSelectElement => {
	const select = document.createElement("select");
	select.className = UI.CLASSES.MODAL_SELECT;
	for (const value of values) {
		const option = document.createElement("option");
		option.value = value;
		option.textContent = value || "(unknown)";
		select.appendChild(option);
	}
	if (selectedValue) {
		select.value = selectedValue;
	}
	return select;
};

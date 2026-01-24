import { UI } from "../../lib";

/**
 * Creates a button group container for modal buttons (cancel, submit, etc).
 */
export const createModalButtons = (onCancel: () => void) => {
	const buttonContainer = document.createElement("div");
	buttonContainer.className = UI.CLASSES.MODAL_BUTTONS;

	const cancelButton = document.createElement("button");
	cancelButton.type = "button";
	cancelButton.className = `${UI.CLASSES.MODAL_BUTTON} ${UI.CLASSES.MODAL_BUTTON_SECONDARY}`;
	cancelButton.textContent = UI.TEXT.CANCEL_BUTTON;
	cancelButton.addEventListener("click", onCancel);

	const continueButton = document.createElement("button");
	continueButton.type = "submit";
	continueButton.className = `${UI.CLASSES.MODAL_BUTTON} ${UI.CLASSES.MODAL_BUTTON_PRIMARY}`;
	continueButton.textContent = "Continue";

	buttonContainer.appendChild(cancelButton);
	buttonContainer.appendChild(continueButton);

	return buttonContainer;
};

/**
 * Creates a radio button toggle control (typically used for mode selection).
 */
export const createModeToggle = (
	name: string,
	value: string,
	labelText: string,
	checked = false
): {
	readonly input: HTMLInputElement;
	readonly row: HTMLDivElement;
} => {
	const input = document.createElement("input");
	input.type = "radio";
	input.name = name;
	input.value = value;
	input.checked = checked;
	input.className = UI.CLASSES.MODAL_CHECKBOX;
	input.id = `linkedin-assist__${name}-${value}`;

	const label = document.createElement("label");
	label.className = UI.CLASSES.MODAL_CHECKBOX_TEXT;
	label.htmlFor = input.id;

	const text = document.createElement("span");
	text.className = UI.CLASSES.MODAL_CHECKBOX_TEXT;
	text.textContent = labelText;

	label.appendChild(text);

	const row = document.createElement("div");
	row.className = UI.CLASSES.MODAL_CHECKBOX_ROW;
	row.appendChild(input);
	row.appendChild(label);
	row.addEventListener("click", () => input.click());

	return { input, row };
};

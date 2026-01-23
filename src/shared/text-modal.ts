/* A simple modal to show text content
 * It includes a copy to clipboard button
 * and a close button.
 */

import { UI } from "./constants";

export const createTextModal = (text: string): void => {
	// Create backdrop
	const backdrop = document.createElement("div");
	backdrop.className = UI.CLASSES.MODAL_BACKDROP;
	// Close modal function
	const closeModal = () => {
		backdrop.remove();
	};
	// Create modal container
	const modal = document.createElement("div");
	modal.className = UI.CLASSES.MODAL;

	// Create modal content
	const content = document.createElement("div");
	content.className = UI.CLASSES.MODAL_CONTENT;
	content.textContent = text;

	// Create button container
	const buttonContainer = document.createElement("div");
	buttonContainer.className = UI.CLASSES.MODAL_BUTTONS;

	// Create copy button
	const copyButton = document.createElement("button");
	copyButton.className = `${UI.CLASSES.MODAL_BUTTON} ${UI.CLASSES.MODAL_BUTTON_PRIMARY}`;
	copyButton.textContent = UI.TEXT.COPY_BUTTON;
	copyButton.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(text);
			copyButton.textContent = UI.TEXT.COPIED_TEXT;
			setTimeout(() => {
				closeModal();
			}, 500);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	});

	// Create close button
	const closeButton = document.createElement("button");
	closeButton.className = `${UI.CLASSES.MODAL_BUTTON} ${UI.CLASSES.MODAL_BUTTON_SECONDARY}`;
	closeButton.textContent = UI.TEXT.CLOSE_BUTTON;
	closeButton.addEventListener("click", closeModal);

	// Close on backdrop click
	backdrop.addEventListener("click", (e) => {
		if (e.target === backdrop) {
			closeModal();
		}
	});

	// Assemble modal
	buttonContainer.appendChild(copyButton);
	buttonContainer.appendChild(closeButton);
	modal.appendChild(content);
	modal.appendChild(buttonContainer);
	backdrop.appendChild(modal);

	// Inject into DOM
	document.body.appendChild(backdrop);
};

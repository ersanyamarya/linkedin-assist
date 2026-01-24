import type { CommentPromptOptions, Emotion } from "../lib";
import { ALLOWED_EMOTIONS, CommentPromptOptionsSchema, UI } from "../lib";

type CommentPromptModalArgs = {
	readonly postText: string;
	readonly comments: readonly string[];
	readonly onSubmit: (options: CommentPromptOptions) => void;
};

const createModalBackdrop = (onClose: () => void): HTMLDivElement => {
	const backdrop = document.createElement("div");
	backdrop.className = UI.CLASSES.MODAL_BACKDROP;
	backdrop.addEventListener("click", (event) => {
		if (event.target === backdrop) {
			onClose();
		}
	});
	return backdrop;
};

const createModalContainer = (): HTMLDivElement => {
	const modal = document.createElement("div");
	modal.className = UI.CLASSES.MODAL;
	return modal;
};

const createSection = (labelText: string, field: HTMLElement, hintText?: string): HTMLDivElement => {
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

const createTextArea = (value: string, readonly = false): HTMLTextAreaElement => {
	const textarea = document.createElement("textarea");
	textarea.className = UI.CLASSES.MODAL_TEXTAREA;
	textarea.value = value;
	textarea.readOnly = readonly;
	return textarea;
};

const createInput = (type: string, placeholder: string, value = ""): HTMLInputElement => {
	const input = document.createElement("input");
	input.className = UI.CLASSES.MODAL_INPUT;
	input.type = type;
	input.placeholder = placeholder;
	input.value = value;
	return input;
};

const createSelect = (values: readonly Emotion[]): HTMLSelectElement => {
	const select = document.createElement("select");
	select.className = UI.CLASSES.MODAL_SELECT;
	for (const value of values) {
		const option = document.createElement("option");
		option.value = value;
		option.textContent = value;
		select.appendChild(option);
	}
	return select;
};

const createCheckboxList = (
	comments: readonly string[]
): {
	readonly container: HTMLDivElement;
	readonly rows: ReadonlyArray<{ checkbox: HTMLInputElement; value: string }>;
} => {
	const container = document.createElement("div");
	container.className = UI.CLASSES.MODAL_LIST;

	if (comments.length === 0) {
		const empty = document.createElement("div");
		empty.className = UI.CLASSES.MODAL_HINT;
		empty.textContent = "(none)";
		container.appendChild(empty);
		return { container, rows: [] };
	}

	const rows = comments.map((comment) => {
		const row = document.createElement("label");
		row.className = UI.CLASSES.MODAL_CHECKBOX_ROW;

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.checked = true;
		checkbox.className = UI.CLASSES.MODAL_CHECKBOX;

		const text = document.createElement("span");
		text.className = UI.CLASSES.MODAL_CHECKBOX_TEXT;
		text.textContent = comment;

		row.appendChild(checkbox);
		row.appendChild(text);
		container.appendChild(row);

		return { checkbox, value: comment };
	});

	return { container, rows };
};

const parseOptionalNumber = (value: string): number | undefined => {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Creates a modal that captures inputs for the LinkedIn comment prompt.
 */
export const createPostCommentPromptModal = (args: CommentPromptModalArgs): void => {
	const { postText, comments, onSubmit } = args;

	const backdrop = createModalBackdrop(() => backdrop.remove());
	const modal = createModalContainer();

	const title = document.createElement("div");
	title.className = UI.CLASSES.MODAL_TITLE;
	title.textContent = "Draft a LinkedIn comment";

	const postTextArea = createTextArea(postText, true);
	const thoughtsArea = createTextArea("");
	const extraInstructionsArea = createTextArea("If possible, do a quick internet check on the topic so the comment stays accurate and factual.");
	const emotionSelect = createSelect(ALLOWED_EMOTIONS);
	const maxLengthInput = createInput("number", "Optional word limit");
	const { container: commentsList, rows } = createCheckboxList(comments);

	const form = document.createElement("form");
	form.className = UI.CLASSES.MODAL_FORM;

	form.appendChild(createSection("Post", postTextArea, "Read-only extracted text"));
	form.appendChild(createSection("Reference comments", commentsList, "Select comments to incorporate"));
	form.appendChild(createSection("Your perspective", thoughtsArea, "Add your viewpoint or context"));
	form.appendChild(createSection("Tone", emotionSelect, "Pick the emotional tone"));
	form.appendChild(createSection("Max length", maxLengthInput, "Leave empty for no limit"));
	form.appendChild(createSection("Extra instructions", extraInstructionsArea, "Optional guidance"));

	const buttonContainer = document.createElement("div");
	buttonContainer.className = UI.CLASSES.MODAL_BUTTONS;

	const cancelButton = document.createElement("button");
	cancelButton.type = "button";
	cancelButton.className = `${UI.CLASSES.MODAL_BUTTON} ${UI.CLASSES.MODAL_BUTTON_SECONDARY}`;
	cancelButton.textContent = UI.TEXT.CANCEL_BUTTON;
	cancelButton.addEventListener("click", () => backdrop.remove());

	const generateButton = document.createElement("button");
	generateButton.type = "submit";
	generateButton.className = `${UI.CLASSES.MODAL_BUTTON} ${UI.CLASSES.MODAL_BUTTON_PRIMARY}`;
	generateButton.textContent = UI.TEXT.GENERATE_BUTTON;

	buttonContainer.appendChild(cancelButton);
	buttonContainer.appendChild(generateButton);

	form.appendChild(buttonContainer);

	form.addEventListener("submit", (event) => {
		event.preventDefault();

		const selectedComments = rows.filter((row) => row.checkbox.checked).map((row) => row.value);
		const options: CommentPromptOptions = {
			postText,
			selectedComments,
			yourThoughts: thoughtsArea.value.trim(),
			emotion: emotionSelect.value as Emotion,
			maxLengthWords: parseOptionalNumber(maxLengthInput.value),
			extraInstructions: extraInstructionsArea.value.trim() || undefined,
		};

		const parsed = CommentPromptOptionsSchema.safeParse(options);
		if (!parsed.success) {
			console.warn("LinkedIn Assist prompt input validation failed:", parsed.error.issues);
			alert("Please review the inputs before generating the prompt.");
			return;
		}

		onSubmit(parsed.data);
		backdrop.remove();
	});

	modal.appendChild(title);
	modal.appendChild(form);
	backdrop.appendChild(modal);
	document.body.appendChild(backdrop);
};

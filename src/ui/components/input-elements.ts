import { UI } from "../../lib";

/**
 * Creates a field group with a label and optional hint.
 */
export const createFieldGroup = (labelText: string, field: HTMLElement, hintText?: string): HTMLDivElement => {
	const group = document.createElement("div");
	group.style.display = "flex";
	group.style.flexDirection = "column";
	group.style.gap = "6px";

	const label = document.createElement("label");
	label.className = UI.CLASSES.MODAL_LABEL;
	label.textContent = labelText;

	group.appendChild(label);
	group.appendChild(field);

	if (hintText) {
		const hint = document.createElement("div");
		hint.className = UI.CLASSES.MODAL_HINT;
		hint.textContent = hintText;
		group.appendChild(hint);
	}

	return group;
};

/**
 * Creates a two-column section with left and right field groups.
 */
export const createTwoColumnSection = (
	left: { readonly label: string; readonly field: HTMLElement; readonly hint?: string },
	right: { readonly label: string; readonly field: HTMLElement; readonly hint?: string }
): HTMLDivElement => {
	const section = document.createElement("div");
	section.className = UI.CLASSES.MODAL_SECTION;
	section.style.display = "flex";
	section.style.flexDirection = "row";
	section.style.gap = "12px";
	section.style.alignItems = "flex-start";
	section.style.flexWrap = "wrap";

	const leftColumn = createFieldGroup(left.label, left.field, left.hint);
	const rightColumn = createFieldGroup(right.label, right.field, right.hint);
	leftColumn.style.flex = "1 1 0";
	rightColumn.style.flex = "1 1 0";
	leftColumn.style.minWidth = "0";
	rightColumn.style.minWidth = "0";

	section.appendChild(leftColumn);
	section.appendChild(rightColumn);

	return section;
};

/**
 * Creates a section title element.
 */
export const createSectionTitle = (labelText: string): HTMLDivElement => {
	const title = document.createElement("div");
	title.className = UI.CLASSES.MODAL_LABEL;
	title.textContent = labelText;
	return title;
};

/**
 * Creates a section with a title and field.
 */
export const createReplyTypeSection = (labelText: string, field: HTMLElement): HTMLDivElement => {
	const section = document.createElement("div");
	section.className = UI.CLASSES.MODAL_SECTION;
	section.appendChild(createSectionTitle(labelText));
	section.appendChild(field);
	return section;
};

/**
 * Creates a checkbox list with items and returns the container and rows data.
 */
export const createCheckboxList = (
	items: readonly string[]
): {
	readonly container: HTMLDivElement;
	readonly rows: ReadonlyArray<{ checkbox: HTMLInputElement; value: string }>;
} => {
	const container = document.createElement("div");
	container.className = UI.CLASSES.MODAL_LIST;

	if (items.length === 0) {
		const empty = document.createElement("div");
		empty.className = UI.CLASSES.MODAL_HINT;
		empty.textContent = "(none)";
		container.appendChild(empty);
		return { container, rows: [] };
	}

	const rows = items.map((item) => {
		const row = document.createElement("label");
		row.className = UI.CLASSES.MODAL_CHECKBOX_ROW;

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.checked = true;
		checkbox.className = UI.CLASSES.MODAL_CHECKBOX;

		const text = document.createElement("span");
		text.className = UI.CLASSES.MODAL_CHECKBOX_TEXT;
		text.textContent = item;

		row.appendChild(checkbox);
		row.appendChild(text);
		container.appendChild(row);

		return { checkbox, value: item };
	});

	return { container, rows };
};

/**
 * Updates the options in a select element.
 */
export const updateSelectOptions = (select: HTMLSelectElement, values: readonly string[], fallbackValue: string) => {
	select.innerHTML = "";
	for (const value of values) {
		const option = document.createElement("option");
		option.value = value;
		option.textContent = value || "(unknown)";
		select.appendChild(option);
	}
	select.value = values.includes(select.value) ? select.value : fallbackValue;
};

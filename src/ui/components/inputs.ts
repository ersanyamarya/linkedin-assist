/**
 * Form input components using semantic HTML.
 */
import { el, fieldset, labeled } from "./dom";

/** Text input */
export const textInput = (placeholder = "", value = "", type = "text"): HTMLInputElement => el("input", { type, placeholder, value, className: "la-input" });

/** Number input */
export const numberInput = (placeholder = "", value?: number): HTMLInputElement =>
	el("input", { type: "number", placeholder, value: value?.toString() ?? "", className: "la-input" });

/** Textarea */
export const textArea = (value = "", readonly = false, placeholder = ""): HTMLTextAreaElement =>
	el("textarea", { value, readOnly: readonly, placeholder, className: "la-textarea" });

/** Select dropdown */
export const select = (options: readonly string[], selected?: string): HTMLSelectElement => {
	const selectEl = el(
		"select",
		{ className: "la-select" },
		options.map((opt) => el("option", { value: opt, textContent: opt || "(none)" }))
	);
	if (selected) selectEl.value = selected;
	return selectEl;
};

/** Update select options dynamically */
export const updateOptions = (selectEl: HTMLSelectElement, options: readonly string[], fallback: string) => {
	const prev = selectEl.value;
	selectEl.innerHTML = "";
	for (const opt of options) selectEl.append(el("option", { value: opt, textContent: opt || "(none)" }));
	selectEl.value = options.includes(prev) ? prev : fallback;
};

/** Single checkbox with label */
export const checkbox = (label: string, checked = false, name?: string): { el: HTMLLabelElement; input: HTMLInputElement } => {
	const input = el("input", { type: "checkbox", checked, name, className: "la-checkbox" });
	return { el: el("label", { className: "la-checkbox-row" }, [input, el("span", {}, [label])]), input };
};

/** Single radio with label */
export const radio = (name: string, value: string, label: string, checked = false): { el: HTMLLabelElement; input: HTMLInputElement } => {
	const id = `la-${name}-${value}`;
	const input = el("input", { type: "radio", name, value, checked, id, className: "la-checkbox" });
	return { el: el("label", { className: "la-checkbox-row", htmlFor: id }, [input, el("span", {}, [label])]), input };
};

/** Checkbox list inside fieldset */
export const checkboxList = (legend: string, items: readonly string[], hint?: string): { el: HTMLFieldSetElement; getSelected: () => string[] } => {
	if (items.length === 0) {
		const fs = fieldset(legend, [el("em", { className: "la-hint" }, ["(none)"])], "la-list");
		return { el: fs, getSelected: () => [] };
	}

	const boxes = items.map((item) => {
		const cb = checkbox(item, true);
		return { input: cb.input, value: item, row: cb.el };
	});

	const content: Node[] = boxes.map((b) => b.row);
	if (hint) content.push(el("small", { className: "la-hint" }, [hint]));

	const fs = fieldset(legend, content, "la-list");
	return { el: fs, getSelected: () => boxes.filter((b) => b.input.checked).map((b) => b.value) };
};

/** Radio group inside fieldset */
export const radioGroup = <T extends string>(
	legend: string,
	options: readonly { value: T; label: string }[],
	defaultValue: T
): { el: HTMLFieldSetElement; getValue: () => T } => {
	const name = `la-radio-${Date.now()}`;
	const radios = options.map((opt) => radio(name, opt.value, opt.label, opt.value === defaultValue));
	const fs = fieldset(
		legend,
		radios.map((r) => r.el),
		"la-list"
	);
	return { el: fs, getValue: () => (radios.find((r) => r.input.checked)?.input.value as T) ?? defaultValue };
};

/** Labeled field (wraps any input with label + optional hint) */
export const field = labeled;

/** Row of fields (inline layout) */
export const fieldRow = (...fields: HTMLElement[]): HTMLDivElement => el("div", { className: "la-row" }, fields);

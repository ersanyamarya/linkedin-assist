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
	return { el: el("label", { className: "la-checkbox-row" }, [input, el("span", { className: "la-checkbox-label" }, [label])]), input };
};

/** Single radio with label */
export const radio = (name: string, value: string, label: string, checked = false): { el: HTMLLabelElement; input: HTMLInputElement } => {
	const id = `la-${name}-${value}`;
	const input = el("input", { type: "radio", name, value, checked, id, className: "la-checkbox" });
	return { el: el("label", { className: "la-checkbox-row", htmlFor: id }, [input, el("span", { className: "la-checkbox-label" }, [label])]), input };
};

/**
 * Selectable cards (one checkbox each) inside a fieldset, with a live "n of m" count and, once
 * there's more than one item, Select all / Clear. Long items are clamped to two lines.
 */
export const checkboxList = (legend: string, items: readonly string[], hint?: string): { el: HTMLFieldSetElement; getSelected: () => string[] } => {
	if (items.length === 0) {
		const fs = fieldset(legend, [el("em", { className: "la-hint" }, ["(none)"])], "la-list");
		return { el: fs, getSelected: () => [] };
	}

	const boxes = items.map((item) => {
		const input = el("input", { type: "checkbox", checked: true, className: "la-checkbox" });
		const row = el("label", { className: "la-list__item" }, [input, el("span", { className: "la-list__text" }, [item])]);
		return { input, value: item, row };
	});

	const count = el("span", { className: "la-label" });
	const updateCount = () => {
		count.textContent = `${legend} · ${boxes.filter((b) => b.input.checked).length} of ${items.length}`;
	};

	const header: Node[] = [count];
	if (items.length > 1) {
		const setAll = (checked: boolean) => {
			for (const b of boxes) b.input.checked = checked;
			updateCount();
		};
		const selectAllBtn = el("button", { type: "button", className: "la-list__action" }, ["Select all"]);
		selectAllBtn.addEventListener("click", () => setAll(true));
		const clearBtn = el("button", { type: "button", className: "la-list__action" }, ["Clear"]);
		clearBtn.addEventListener("click", () => setAll(false));
		header.push(el("span", { className: "la-list__actions" }, [selectAllBtn, clearBtn]));
	}

	const content: Node[] = [el("legend", { className: "la-list__header" }, header), ...boxes.map((b) => b.row)];
	if (hint) content.push(el("small", { className: "la-hint" }, [hint]));

	const fs = el("fieldset", { className: "la-list" }, content);
	fs.addEventListener("change", updateCount);
	updateCount();
	return { el: fs, getSelected: () => boxes.filter((b) => b.input.checked).map((b) => b.value) };
};

/** Segmented (pill) toggle for a small set of mutually exclusive options */
export const radioGroup = <T extends string>(
	legend: string,
	options: readonly { value: T; label: string }[],
	defaultValue: T
): { el: HTMLFieldSetElement; getValue: () => T } => {
	const name = `la-radio-${Date.now()}`;
	const radios = options.map((opt) => {
		const input = el("input", { type: "radio", name, value: opt.value, checked: opt.value === defaultValue, className: "la-segmented__input" });
		const option = el("label", { className: "la-segmented__option" }, [input, el("span", {}, [opt.label])]);
		return { input, option };
	});

	const fs = el("fieldset", { className: "la-segmented" }, [
		el("legend", { className: "la-label" }, [legend]),
		el(
			"div",
			{ className: "la-segmented__track" },
			radios.map((r) => r.option)
		),
	]);

	return { el: fs, getValue: () => (radios.find((r) => r.input.checked)?.input.value as T) ?? defaultValue };
};

let pillGroupCounter = 0;

/**
 * Wrapping row of pill buttons for one choice among a handful of options. Backed by real radio
 * inputs so arrow keys and screen readers work; `el` fires a bubbling `change` when the pick changes.
 */
export const pillGroup = <T extends string>(
	legend: string,
	options: readonly { value: T; label: string }[],
	defaultValue: T,
	hint?: string
): { el: HTMLFieldSetElement; getValue: () => T } => {
	const name = `la-pills-${++pillGroupCounter}`;
	const inputs = options.map((opt) => el("input", { type: "radio", name, value: opt.value, checked: opt.value === defaultValue, className: "la-pill__input" }));
	const pills = options.map((opt, i) => el("label", { className: "la-pill" }, [inputs[i] as HTMLInputElement, el("span", {}, [opt.label])]));

	// The legend must stay the fieldset's first child to name the group, so the hint sits inside it.
	const header = el("legend", { className: "la-pills__header" }, [
		el("span", { className: "la-label" }, [legend]),
		...(hint ? [el("small", { className: "la-hint" }, [hint])] : []),
	]);
	const fs = el("fieldset", { className: "la-pills" }, [header, el("div", { className: "la-pills__track" }, pills)]);

	return { el: fs, getValue: () => (inputs.find((input) => input.checked)?.value as T) ?? defaultValue };
};

/** On/off switch with a title and optional description, for a single boolean setting */
export const toggleSwitch = (title: string, description?: string, initial = false): { el: HTMLDivElement; isOn: () => boolean } => {
	let on = initial;
	const knob = el("span", { className: "la-switch__knob" });
	const button = el("button", { type: "button", className: "la-switch", role: "switch" }, [knob]);
	button.setAttribute("aria-label", title);
	const sync = () => button.setAttribute("aria-checked", String(on));
	button.addEventListener("click", () => {
		on = !on;
		sync();
	});
	sync();

	const text = el("div", { className: "la-switch-row__text" }, [
		el("div", { className: "la-switch-row__title" }, [title]),
		...(description ? [el("small", { className: "la-hint" }, [description])] : []),
	]);
	return { el: el("div", { className: "la-switch-row" }, [text, button]), isOn: () => on };
};

/** Labeled field (wraps any input with label + optional hint) */
export const field = labeled;

/** Row of fields (inline layout) */
export const fieldRow = (...fields: HTMLElement[]): HTMLDivElement => el("div", { className: "la-row" }, fields);

/**
 * Minimal DOM element factories using semantic HTML elements.
 * Uses <fieldset>/<legend> for grouping, <label> for accessibility.
 */

type ElementAttrs<T extends HTMLElement> = Partial<Record<keyof T, unknown>> & {
	className?: string;
	[attr: `aria-${string}` | `data-${string}`]: string | number;
};

/** Generic element factory with attribute assignment */
export const el = <K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attrs: ElementAttrs<HTMLElementTagNameMap[K]> = {},
	children: (Node | string)[] = []
): HTMLElementTagNameMap[K] => {
	const element = document.createElement(tag);
	for (const [key, value] of Object.entries(attrs)) {
		if (key === "className" && typeof value === "string") {
			element.className = value;
		} else if (key.startsWith("on") && typeof value === "function") {
			element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
		} else if (key.includes("-") && (typeof value === "string" || typeof value === "number")) {
			// Hyphenated keys (aria-*, data-*) aren't real JS properties; they need setAttribute.
			element.setAttribute(key, String(value));
		} else if (value !== undefined && value !== null) {
			(element as Record<string, unknown>)[key] = value;
		}
	}
	for (const child of children) {
		element.append(child);
	}
	return element;
};

/** Creates a <fieldset> with an optional <legend> */
export const fieldset = (legend: string | undefined, children: (Node | string)[], className = ""): HTMLFieldSetElement =>
	el("fieldset", { className }, legend ? [el("legend", {}, [legend]), ...children] : children);

/** Creates a labeled input wrapper with <label> */
export const labeled = (labelText: string, input: HTMLElement, hint?: string): HTMLDivElement =>
	el(
		"div",
		{ className: "la-field" },
		[el("label", { className: "la-label" }, [labelText]), input, hint ? el("small", { className: "la-hint" }, [hint]) : null].filter(Boolean) as Node[]
	);

/**
 * Minimal DOM element factories using semantic HTML elements.
 * Uses <fieldset>/<legend> for grouping, <label> for accessibility.
 */

type ElementAttrs<T extends HTMLElement> = Partial<Record<keyof T, unknown>> & {
	className?: string;
	[attr: `aria-${string}` | `data-${string}`]: string | number;
};

type AttrRule = {
	matches: (key: string, value: unknown) => boolean;
	apply: (element: HTMLElement, key: string, value: unknown) => void;
};

const addListener = (element: HTMLElement, key: string, value: unknown): void => element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);

// Hyphenated keys aren't real JS properties; they need setAttribute.
const setHyphenated = (element: HTMLElement, key: string, value: unknown): void => {
	if (typeof value === "string" || typeof value === "number") element.setAttribute(key, String(value));
};

const setProperty = (element: HTMLElement, key: string, value: unknown): void => {
	(element as unknown as Record<string, unknown>)[key] = value;
};

/** Checked in order; the first match wins, and anything unmatched is set as a JS property. */
const ATTR_RULES: readonly AttrRule[] = [
	{ matches: (_key, value) => value === undefined || value === null, apply: () => undefined },
	{ matches: (key, value) => key === "className" && typeof value === "string", apply: setProperty },
	{ matches: (key, value) => key.startsWith("on") && typeof value === "function", apply: addListener },
	{ matches: (key) => key.includes("-"), apply: setHyphenated },
];

/** Sets one attribute: className, on* listener, hyphenated (aria-*, data-*) attribute, or JS property. */
const applyAttr = (element: HTMLElement, key: string, value: unknown): void => {
	const rule = ATTR_RULES.find((candidate) => candidate.matches(key, value));
	(rule?.apply ?? setProperty)(element, key, value);
};

/** Generic element factory with attribute assignment */
export const el = <K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attrs: ElementAttrs<HTMLElementTagNameMap[K]> = {},
	children: (Node | string)[] = []
): HTMLElementTagNameMap[K] => {
	const element = document.createElement(tag);
	for (const [key, value] of Object.entries(attrs)) applyAttr(element, key, value);
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

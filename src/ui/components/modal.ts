/**
 * Modal components: backdrop, container, buttons.
 */
import { el } from "./dom";

const PREFIX = "la-modal";

/** Modal backdrop (click outside to close) */
export const modalBackdrop = (onClose: () => void): HTMLDivElement => {
	const backdrop = el("div", { className: PREFIX });
	backdrop.addEventListener("click", (e) => e.target === backdrop && onClose());
	return backdrop;
};

/** Modal container */
export const modalBox = (title: string, children: (Node | string)[]): HTMLDivElement =>
	el("div", { className: `${PREFIX}__box` }, [el("h2", { className: `${PREFIX}__title` }, [title]), ...children]);

/** Modal form */
export const modalForm = (children: HTMLElement[], onSubmit: (e: SubmitEvent) => void): HTMLFormElement => {
	const form = el("form", { className: `${PREFIX}__form` }, children);
	form.addEventListener("submit", onSubmit);
	return form;
};

/** Button */
export const btn = (text: string, variant: "primary" | "secondary" = "secondary", type: "button" | "submit" = "button"): HTMLButtonElement =>
	el("button", { type, className: `la-btn la-btn--${variant}`, textContent: text });

/** Button row (cancel + submit) */
export const modalButtons = (cancelText: string, submitText: string, onCancel: () => void): HTMLDivElement => {
	const cancelBtn = btn(cancelText, "secondary");
	cancelBtn.addEventListener("click", onCancel);
	return el("div", { className: `${PREFIX}__actions` }, [cancelBtn, btn(submitText, "primary", "submit")]);
};

/** Full modal assembly helper */
export const showModal = (title: string, form: HTMLFormElement): { backdrop: HTMLDivElement; close: () => void } => {
	const close = () => backdrop.remove();
	const backdrop = modalBackdrop(close);
	const box = modalBox(title, [form]);
	backdrop.append(box);
	document.body.append(backdrop);
	return { backdrop, close };
};

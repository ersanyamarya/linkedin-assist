/**
 * Modal components: backdrop, header, body, footer.
 * Layout: fixed header + scrollable body + fixed footer.
 */
import { el } from "./dom";

const PREFIX = "la-modal";

/** Modal backdrop (click outside to close) */
export const modalBackdrop = (onClose: () => void): HTMLDivElement => {
	const backdrop = el("div", { className: PREFIX });
	backdrop.addEventListener("click", (e) => e.target === backdrop && onClose());
	return backdrop;
};

/** Modal header (static title area) */
export const modalHeader = (title: string): HTMLElement =>
	el("header", { className: `${PREFIX}__header` }, [el("h2", { className: `${PREFIX}__title` }, [title])]);

/** Modal body (scrollable content area) */
export const modalBody = (children: (Node | string)[]): HTMLDivElement => el("div", { className: `${PREFIX}__body` }, children);

/** Modal footer (static button area) */
export const modalFooter = (children: (Node | string)[]): HTMLElement => el("footer", { className: `${PREFIX}__footer` }, children);

/** Modal container with header/body/footer structure */
export const modalBox = (title: string, body: HTMLElement, footer?: HTMLElement): HTMLDivElement => {
	const children: HTMLElement[] = [];
	if (title) children.push(modalHeader(title));
	children.push(body);
	if (footer) children.push(footer);
	return el("div", { className: `${PREFIX}__box` }, children);
};

/** Modal form (used inside body) */
export const modalForm = (children: HTMLElement[], onSubmit: (e: SubmitEvent) => void): HTMLFormElement => {
	const form = el("form", { className: `${PREFIX}__form` }, children);
	form.addEventListener("submit", onSubmit);
	return form;
};

/** Button */
export const btn = (text: string, variant: "primary" | "secondary" = "secondary", type: "button" | "submit" = "button"): HTMLButtonElement =>
	el("button", { type, className: `la-btn la-btn--${variant}`, textContent: text });

/** Button row (cancel + submit) - typically placed in footer */
export const modalButtons = (cancelText: string, submitText: string, onCancel: () => void): HTMLDivElement => {
	const cancelBtn = btn(cancelText, "secondary");
	cancelBtn.addEventListener("click", onCancel);
	return el("div", { className: `${PREFIX}__actions` }, [cancelBtn, btn(submitText, "primary", "submit")]);
};

type ModalResult = { backdrop: HTMLDivElement; close: () => void };

/** Full modal assembly with header/body/footer layout */
export const showModal = (title: string, bodyContent: HTMLElement[], footer?: HTMLElement): ModalResult => {
	const close = () => backdrop.remove();
	const backdrop = modalBackdrop(close);
	const body = modalBody(bodyContent);
	const box = modalBox(title, body, footer);
	backdrop.append(box);
	document.body.append(backdrop);
	return { backdrop, close };
};

/** Convenience: show modal with a form and buttons */
export const showFormModal = (
	title: string,
	fields: HTMLElement[],
	buttons: { cancel: string; submit: string },
	onSubmit: (e: SubmitEvent, close: () => void) => void
): ModalResult => {
	let closeModal: () => void = () => {};

	const form = modalForm(fields, (e) => onSubmit(e, closeModal));
	const footer = modalFooter([modalButtons(buttons.cancel, buttons.submit, () => closeModal())]);
	const result = showModal(title, [form], footer);
	closeModal = result.close;

	return result;
};

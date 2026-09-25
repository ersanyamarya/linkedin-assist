/**
 * Modal components: backdrop, header, body, footer.
 * Layout: fixed header + scrollable body + fixed footer.
 */
import { UI } from "../../lib/constants";
import { el } from "./dom";

const PREFIX = "la-modal";

let formIdCounter = 0;
const generateFormId = (): string => `${PREFIX}-form-${++formIdCounter}`;

/** Modal backdrop (click outside to close) */
const modalBackdrop = (onClose: () => void): HTMLDivElement => {
	const backdrop = el("div", { className: PREFIX });
	backdrop.addEventListener("click", (e) => e.target === backdrop && onClose());
	return backdrop;
};

/** Icon-only close (×) button, used in the modal header */
const closeIconButton = (onClose: () => void): HTMLButtonElement => {
	const button = el("button", {
		type: "button",
		className: `${PREFIX}__close`,
		innerHTML: UI.SVG.CLOSE,
		"aria-label": "Close",
	});
	button.addEventListener("click", onClose);
	return button;
};

/** Modal header (static title area, optional one-line subtitle) with a close (×) button */
const modalHeader = (title: string, onClose?: () => void, subtitle?: string): HTMLElement => {
	const heading = el("h2", { className: `${PREFIX}__title` }, [title]);
	const titleBlock = subtitle ? el("div", { className: `${PREFIX}__heading` }, [heading, el("p", { className: `${PREFIX}__subtitle` }, [subtitle])]) : heading;
	return el("header", { className: `${PREFIX}__header` }, [titleBlock, ...(onClose ? [closeIconButton(onClose)] : [])]);
};

/** Modal body (scrollable content area) */
const modalBody = (children: (Node | string)[]): HTMLDivElement => el("div", { className: `${PREFIX}__body` }, children);

/** Modal footer (static button area) */
export const modalFooter = (children: (Node | string)[]): HTMLElement => el("footer", { className: `${PREFIX}__footer` }, children);

/** Modal container with header/body/footer structure */
const modalBox = (title: string, body: HTMLElement, footer?: HTMLElement, onClose?: () => void, subtitle?: string): HTMLDivElement => {
	const children: HTMLElement[] = [];
	if (title) children.push(modalHeader(title, onClose, subtitle));
	children.push(body);
	if (footer) children.push(footer);
	return el("div", { className: `${PREFIX}__box` }, children);
};

/** Modal form (used inside body) — returns form with unique ID for external button association */
export const modalForm = (children: HTMLElement[], onSubmit: (e: SubmitEvent) => void): HTMLFormElement => {
	const form = el("form", { className: `${PREFIX}__form`, id: generateFormId() }, children);
	form.addEventListener("submit", onSubmit);
	return form;
};

/** Button */
export const btn = (text: string, variant: "primary" | "secondary" = "secondary", type: "button" | "submit" = "button"): HTMLButtonElement =>
	el("button", { type, className: `la-btn la-btn--${variant}`, textContent: text });

/** Button row (cancel + submit) - typically placed in footer, linked to form via `form` attribute */
export const modalButtons = (cancelText: string, submitText: string, onCancel: () => void, formId?: string): HTMLDivElement => {
	const cancelBtn = btn(cancelText, "secondary");
	cancelBtn.addEventListener("click", onCancel);
	const submitBtn = btn(submitText, "primary", "submit");
	if (formId) submitBtn.setAttribute("form", formId);
	return el("div", { className: `${PREFIX}__actions` }, [cancelBtn, submitBtn]);
};

type ModalResult = { backdrop: HTMLDivElement; close: () => void };

/** Full modal assembly with header/body/footer layout */
export const showModal = (title: string, bodyContent: HTMLElement[], footer?: HTMLElement, subtitle?: string): ModalResult => {
	const onKeydown = (e: KeyboardEvent) => e.key === "Escape" && close();
	const close = () => {
		backdrop.remove();
		document.removeEventListener("keydown", onKeydown);
	};
	const backdrop = modalBackdrop(close);
	const body = modalBody(bodyContent);
	const box = modalBox(title, body, footer, close, subtitle);
	backdrop.append(box);
	document.body.append(backdrop);
	document.addEventListener("keydown", onKeydown);
	return { backdrop, close };
};

/**
 * Result window for a generated prompt: the text in a scrollable panel with a word count,
 * and a Copy button that confirms the copy.
 */
import { btn, el, modalFooter, showModal } from "./components";

const COPIED_RESET_MS = 1500;
const WHITESPACE = /\s+/;
const EXTRA_BLANK_LINES = /\n{3,}/g;

const COPY_ICON =
	'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const CHECK_ICON =
	'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

const DEFAULT_SUBTITLE = "Paste it into your AI chat, then bring the answer back to LinkedIn.";

const countWords = (text: string): number => text.split(WHITESPACE).filter(Boolean).length;

export const createTextModal = (text: string, title = "Your prompt is ready", subtitle = DEFAULT_SUBTITLE): void => {
	const normalizedText = text.replace(EXTRA_BLANK_LINES, "\n\n");

	const panel = el("div", { className: "la-prompt-panel", tabIndex: 0 }, [normalizedText]);
	panel.setAttribute("aria-label", title);
	const stats = el("small", { className: "la-hint" }, [`${countWords(normalizedText)} words · ${normalizedText.length} characters`]);
	const content = el("div", { className: "la-field la-compose" }, [
		el("div", { className: "la-field__header" }, [el("span", { className: "la-label" }, ["Prompt"]), stats]),
		panel,
	]);

	const copyBtn = btn("", "primary");
	copyBtn.classList.add("la-btn--icon");
	const setCopied = (copied: boolean) => {
		copyBtn.innerHTML = copied ? CHECK_ICON : COPY_ICON;
		copyBtn.append(el("span", {}, [copied ? "Copied" : "Copy prompt"]));
		copyBtn.classList.toggle("la-btn--success", copied);
	};
	setCopied(false);
	const closeBtn = btn("Close", "secondary");

	const footer = modalFooter([
		el("div", { className: "la-modal__footer-row" }, [
			el("small", { className: "la-hint" }, ["Nothing is sent anywhere."]),
			el("div", { className: "la-modal__actions" }, [closeBtn, copyBtn]),
		]),
	]);

	const { close } = showModal(title, [content], footer, subtitle);
	copyBtn.focus();

	let resetTimer: ReturnType<typeof setTimeout> | undefined;
	copyBtn.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(normalizedText);
			setCopied(true);
			clearTimeout(resetTimer);
			resetTimer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	});

	closeBtn.addEventListener("click", close);
};

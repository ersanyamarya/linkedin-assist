/**
 * Result window for a generated prompt: the text in a scrollable panel with a word count,
 * and a Copy button that confirms the copy. When an OpenAI-compatible API is set up in the
 * options, a Generate button streams the AI's answer into the same panel, with Copy, Insert
 * (when the caller has an editor to fill) and Regenerate.
 */
import { type AiStatus, generateReply, getAiStatus, openAiSettings } from "../lib/ai-bridge";
import { btn, el, modalFooter, showModal } from "./components";
import { showNotice } from "./notice";

const COPIED_RESET_MS = 1500;
const WHITESPACE = /\s+/;
const EXTRA_BLANK_LINES = /\n{3,}/g;
const OUTPUT_CLASS = "la-prompt-panel--output";

const COPY_ICON =
	'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const CHECK_ICON =
	'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const SPARKLE_ICON =
	'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4M17 19h4"/></svg>';

const DEFAULT_SUBTITLE = "Paste it into your AI chat, then bring the answer back to LinkedIn.";
const LOCAL_HINT = "Nothing is sent anywhere.";

const countWords = (text: string): number => text.split(WHITESPACE).filter(Boolean).length;
const describeLength = (text: string): string => `${countWords(text)} words · ${text.length} characters`;

/** Copy button that briefly switches to "Copied" after a successful copy. */
const copyButton = (getText: () => string, label: string, variant: "primary" | "secondary"): HTMLButtonElement => {
	const button = btn("", variant);
	button.classList.add("la-btn--icon");
	const setCopied = (copied: boolean) => {
		button.innerHTML = copied ? CHECK_ICON : COPY_ICON;
		button.append(el("span", {}, [copied ? "Copied" : label]));
		button.classList.toggle("la-btn--success", copied);
	};
	setCopied(false);

	let resetTimer: ReturnType<typeof setTimeout> | undefined;
	button.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(getText());
			setCopied(true);
			clearTimeout(resetTimer);
			resetTimer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	});
	return button;
};

const iconButton = (icon: string, label: string, variant: "primary" | "secondary"): HTMLButtonElement => {
	const button = btn("", variant);
	button.classList.add("la-btn--icon");
	button.innerHTML = icon;
	button.append(el("span", {}, [label]));
	return button;
};

type TextModalOptions = {
	/** Offer AI generation when it's configured. Off for windows that don't hold a prompt. */
	generate?: boolean;
	/** Reopens the form that built this prompt. Without it the prompt view has Close instead of Back. */
	onBack?: () => void;
	/** Puts a generated answer into the LinkedIn editor. Without it there's no Insert button. */
	onInsert?: (text: string) => void;
};

export const createTextModal = (
	text: string,
	title = "Your prompt is ready",
	subtitle = DEFAULT_SUBTITLE,
	{ generate = true, onBack, onInsert }: TextModalOptions = {}
): void => {
	const normalizedText = text.replace(EXTRA_BLANK_LINES, "\n\n");

	const label = el("span", { className: "la-label" });
	const stats = el("small", { className: "la-hint" });
	const panel = el("div", { className: "la-prompt-panel", tabIndex: 0 });
	panel.setAttribute("aria-label", title);
	const content = el("div", { className: "la-field la-compose" }, [el("div", { className: "la-field__header" }, [label, stats]), panel]);

	const hint = el("small", { className: "la-hint" });
	const actions = el("div", { className: "la-modal__actions" });
	const footer = modalFooter([el("div", { className: "la-modal__footer-row" }, [hint, actions])]);

	let stopGenerating: (() => void) | undefined;
	const stop = () => {
		stopGenerating?.();
		stopGenerating = undefined;
	};
	const { close } = showModal(title, [content], footer, subtitle, stop);

	// With a form behind this prompt, "Back" returns to it to tweak the inputs; × still closes both.
	const closeBtn = btn(onBack ? "Back" : "Close", "secondary");
	closeBtn.addEventListener("click", () => {
		close();
		onBack?.();
	});

	let aiStatus: AiStatus | undefined;
	let view: "prompt" | "output" = "prompt";

	const showPrompt = () => {
		stop();
		view = "prompt";
		label.textContent = "Prompt";
		panel.classList.remove(OUTPUT_CLASS);
		panel.textContent = normalizedText;
		stats.textContent = describeLength(normalizedText);

		const canGenerate = Boolean(aiStatus?.configured);
		const copyBtn = copyButton(() => normalizedText, "Copy prompt", canGenerate ? "secondary" : "primary");
		if (canGenerate) {
			const generateBtn = iconButton(SPARKLE_ICON, "Generate", "primary");
			generateBtn.addEventListener("click", showOutput);
			hint.textContent = `Copy it, or generate the answer with ${aiStatus?.model}.`;
			actions.replaceChildren(closeBtn, copyBtn, generateBtn);
			generateBtn.focus();
			return;
		}

		hint.replaceChildren(LOCAL_HINT);
		if (generate && aiStatus) {
			const setupLink = el("button", { type: "button", className: "la-link" }, ["Generate here instead"]);
			setupLink.addEventListener("click", openAiSettings);
			hint.append(" ", setupLink);
		}
		actions.replaceChildren(closeBtn, copyBtn);
		copyBtn.focus();
	};

	const showOutput = () => {
		stop();
		view = "output";
		let output = "";
		let busy = true;

		label.textContent = `Answer · ${aiStatus?.model}`;
		panel.classList.add(OUTPUT_CLASS);
		panel.textContent = "";
		stats.textContent = "Generating...";
		hint.textContent = `Sent to ${aiStatus?.host}. Read it before you post.`;

		const backBtn = btn("Back to prompt", "secondary");
		backBtn.addEventListener("click", showPrompt);
		const stopBtn = btn("Stop", "secondary");
		const copyBtn = copyButton(() => output, "Copy", onInsert ? "secondary" : "primary");
		const insertBtn = onInsert ? btn("Insert", "primary") : undefined;
		insertBtn?.addEventListener("click", () => {
			onInsert?.(output);
			close();
		});

		const setBusy = (value: boolean) => {
			busy = value;
			stopBtn.textContent = busy ? "Stop" : "Regenerate";
			copyBtn.disabled = busy || !output;
			if (insertBtn) insertBtn.disabled = busy || !output;
			panel.setAttribute("aria-busy", String(busy));
		};
		const finish = (message: string) => {
			stopGenerating = undefined;
			setBusy(false);
			stats.textContent = output ? describeLength(output) : message;
			(insertBtn && !insertBtn.disabled ? insertBtn : stopBtn).focus();
		};
		stopBtn.addEventListener("click", () => {
			if (!busy) {
				showOutput();
				return;
			}
			stop();
			finish("Stopped");
		});

		actions.replaceChildren(backBtn, stopBtn, copyBtn, ...(insertBtn ? [insertBtn] : []));
		setBusy(true);
		stopBtn.focus();

		stopGenerating = generateReply(normalizedText, {
			onDelta: (delta) => {
				const atBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 24;
				output += delta;
				panel.textContent = output;
				stats.textContent = describeLength(output);
				if (atBottom) panel.scrollTop = panel.scrollHeight;
			},
			onDone: () => finish("The server sent an empty answer."),
			onError: (message) => {
				finish("Failed");
				showNotice("Couldn't generate an answer", message);
			},
		});
	};

	showPrompt();
	if (!generate) return;
	getAiStatus().then((status) => {
		aiStatus = status;
		if (view === "prompt" && panel.isConnected) showPrompt();
	});
};

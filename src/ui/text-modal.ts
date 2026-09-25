/**
 * Result window for a generated prompt: the text in a scrollable panel with a word count,
 * and a Copy button that confirms the copy. When an OpenAI-compatible API is set up in the
 * options, a Generate button streams the AI's answer into the same panel, with Copy, Insert
 * (when the caller has an editor to fill) and Regenerate. The prompt is editable, and a step bar
 * (Inputs › Prompt › Answer) jumps back to earlier steps, including the form that built it.
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
	/** Offer AI generation when it's configured, and let the user edit the prompt. Off for windows that don't hold a prompt. */
	generate?: boolean;
	/** Reopens the form that built this prompt. Without it the prompt view has Close instead of Back. */
	onBack?: () => void;
	/** Puts a generated answer into the LinkedIn editor. Without it there's no Insert button. */
	onInsert?: (text: string) => void;
};

type Step = "inputs" | "prompt" | "answer";

const STEP_LABELS: Record<Step, string> = { inputs: "Inputs", prompt: "Prompt", answer: "Answer" };

export const createTextModal = (
	text: string,
	title = "Your prompt is ready",
	subtitle = DEFAULT_SUBTITLE,
	{ generate = true, onBack, onInsert }: TextModalOptions = {}
): void => {
	const originalPrompt = text.replace(EXTRA_BLANK_LINES, "\n\n");

	const steps = el("nav", { className: "la-steps", "aria-label": "Steps" });
	const label = el("span", { className: "la-label" });
	const stats = el("small", { className: "la-hint" });
	const resetLink = el("button", { type: "button", className: "la-link", hidden: true }, ["Undo edits"]);
	const promptInput = el("textarea", { className: "la-prompt-panel", value: originalPrompt, readOnly: !generate, spellcheck: false });
	promptInput.setAttribute("aria-label", title);
	const answerPanel = el("div", { className: `la-prompt-panel ${OUTPUT_CLASS}`, tabIndex: 0, hidden: true });
	answerPanel.setAttribute("aria-label", "Generated answer");
	const content = el("div", { className: "la-field la-compose" }, [
		steps,
		el("div", { className: "la-field__header" }, [label, el("span", { className: "la-field__meta" }, [resetLink, stats])]),
		promptInput,
		answerPanel,
	]);

	const hint = el("small", { className: "la-hint" });
	const actions = el("div", { className: "la-modal__actions" });
	const footer = modalFooter([el("div", { className: "la-modal__footer-row" }, [hint, actions])]);

	let stopGenerating: (() => void) | undefined;
	const stop = () => {
		stopGenerating?.();
		stopGenerating = undefined;
	};
	const { close } = showModal(title, [content], footer, subtitle, stop);

	let aiStatus: AiStatus | undefined;
	let view: Step = "prompt";
	let answer = "";

	const getPrompt = () => promptInput.value;
	const isEdited = () => getPrompt() !== originalPrompt;
	const syncPromptMeta = () => {
		stats.textContent = describeLength(getPrompt());
		resetLink.hidden = !isEdited();
	};
	promptInput.addEventListener("input", syncPromptMeta);
	resetLink.addEventListener("click", () => {
		promptInput.value = originalPrompt;
		syncPromptMeta();
		promptInput.focus();
	});

	/** Closes this window and reopens the form, after confirming if the prompt was edited. */
	const backToInputs = () => {
		if (isEdited() && !window.confirm("Go back to the inputs? Your edits to this prompt will be lost.")) return;
		close();
		onBack?.();
	};

	const renderSteps = () => {
		const available: Step[] = [...(onBack ? (["inputs"] as const) : []), "prompt", ...(aiStatus?.configured ? (["answer"] as const) : [])];
		steps.hidden = available.length < 2;
		steps.replaceChildren(
			...available.map((step, index) => {
				const button = el("button", { type: "button", className: "la-steps__step" }, [`${index + 1}. ${STEP_LABELS[step]}`]);
				if (step === view) button.setAttribute("aria-current", "step");
				button.disabled = step === view || (step === "answer" && !answer);
				button.addEventListener("click", () => {
					if (step === "inputs") backToInputs();
					else if (step === "prompt") showPrompt();
					else showAnswer(false);
				});
				return button;
			})
		);
	};

	const showPrompt = () => {
		stop();
		view = "prompt";
		label.textContent = generate ? "Prompt · editable" : "Details";
		promptInput.hidden = false;
		answerPanel.hidden = true;
		syncPromptMeta();
		renderSteps();

		const backBtn = btn(onBack ? "Back" : "Close", "secondary");
		backBtn.addEventListener("click", onBack ? backToInputs : close);
		const canGenerate = Boolean(aiStatus?.configured);
		const copyBtn = copyButton(getPrompt, generate ? "Copy prompt" : "Copy", canGenerate ? "secondary" : "primary");
		if (canGenerate) {
			const generateBtn = iconButton(SPARKLE_ICON, "Generate", "primary");
			generateBtn.addEventListener("click", () => showAnswer(true));
			hint.textContent = `Edit it if you like, then copy it or generate the answer with ${aiStatus?.model}.`;
			actions.replaceChildren(backBtn, copyBtn, generateBtn);
			generateBtn.focus();
			return;
		}

		hint.replaceChildren(LOCAL_HINT);
		if (generate && aiStatus) {
			const setupLink = el("button", { type: "button", className: "la-link" }, ["Generate here instead"]);
			setupLink.addEventListener("click", openAiSettings);
			hint.append(" ", setupLink);
		}
		actions.replaceChildren(backBtn, copyBtn);
		copyBtn.focus();
	};

	/** Shows the answer view; `regenerate` starts a new request, otherwise the last answer is shown as is. */
	const showAnswer = (regenerate: boolean) => {
		stop();
		view = "answer";
		let busy = false;

		label.textContent = `Answer · ${aiStatus?.model}`;
		promptInput.hidden = true;
		answerPanel.hidden = false;
		resetLink.hidden = true;
		hint.textContent = `Sent to ${aiStatus?.host}. Read it before you post.`;

		const backBtn = btn("Back to prompt", "secondary");
		backBtn.addEventListener("click", showPrompt);
		const regenerateBtn = btn("Regenerate", "secondary");
		const copyBtn = copyButton(() => answer, "Copy", onInsert ? "secondary" : "primary");
		const insertBtn = onInsert ? btn("Insert", "primary") : undefined;
		insertBtn?.addEventListener("click", () => {
			onInsert?.(answer);
			close();
		});

		const setBusy = (value: boolean) => {
			busy = value;
			regenerateBtn.textContent = busy ? "Stop" : "Regenerate";
			copyBtn.disabled = busy || !answer;
			if (insertBtn) insertBtn.disabled = busy || !answer;
			answerPanel.setAttribute("aria-busy", String(busy));
			renderSteps();
		};
		const finish = (message: string) => {
			stopGenerating = undefined;
			setBusy(false);
			stats.textContent = answer ? describeLength(answer) : message;
			(insertBtn && !insertBtn.disabled ? insertBtn : regenerateBtn).focus();
		};
		regenerateBtn.addEventListener("click", () => {
			if (!busy) {
				showAnswer(true);
				return;
			}
			stop();
			finish("Stopped");
		});

		actions.replaceChildren(backBtn, regenerateBtn, copyBtn, ...(insertBtn ? [insertBtn] : []));

		if (!regenerate) {
			answerPanel.textContent = answer;
			finish("");
			return;
		}

		answer = "";
		answerPanel.textContent = "";
		stats.textContent = "Generating...";
		setBusy(true);
		regenerateBtn.focus();

		stopGenerating = generateReply(getPrompt(), {
			onDelta: (delta) => {
				const atBottom = answerPanel.scrollHeight - answerPanel.scrollTop - answerPanel.clientHeight < 24;
				answer += delta;
				answerPanel.textContent = answer;
				stats.textContent = describeLength(answer);
				if (atBottom) answerPanel.scrollTop = answerPanel.scrollHeight;
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
		if (view === "prompt" && promptInput.isConnected) showPrompt();
	});
};

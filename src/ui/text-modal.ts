/**
 * Result window for a generated prompt: the text in a scrollable panel with a word count,
 * and a Copy button that confirms the copy. When an OpenAI-compatible API is set up in the
 * options, a Generate button streams the AI's answer into the same panel, with Copy, Insert
 * (when the caller has an editor to fill) and Regenerate. The prompt is editable, and a step bar
 * (Inputs › Prompt › Answer) jumps back to earlier steps, including the form that built it.
 * Under an answer, one-click rewrites (shorter, more casual...) and a local check for AI tells
 * and length problems help polish it before it's inserted.
 */
import { findSlop, fixPunctuation, type SlopIssue } from "../lib";
import { type AiStatus, generateReply, getAiStatus, openAiSettings, setActiveProvider } from "../lib/ai-bridge";
import { buildRefinePrompt, REFINEMENTS } from "../prompt";
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
// A draft this much longer than its neighbours (and at least MIN_WORDS_TO_WARN) looks out of place in a thread.
const LONGER_THAN_TYPICAL_FACTOR = 2;
const MIN_WORDS_TO_WARN = 40;
// Streaming keeps the answer scrolled to the end unless the reader has scrolled up by more than this.
const SCROLL_FOLLOW_PX = 24;

const countWords = (text: string): number => text.split(WHITESPACE).filter(Boolean).length;
const describeLength = (text: string): string => `${countWords(text)} words · ${text.length} characters`;

/** Length problems with `text`, as `SlopIssue`-shaped entries so they list alongside the AI-tell checks. */
const findLengthProblems = (text: string, { maxChars, typicalWords }: Pick<TextModalOptions, "maxChars" | "typicalWords">): SlopIssue[] => {
	const problems: SlopIssue[] = [];
	if (maxChars && text.length > maxChars) problems.push({ label: `${text.length - maxChars} characters over the ${maxChars} limit`, fixable: false });
	if (typicalWords && countWords(text) > Math.max(MIN_WORDS_TO_WARN, typicalWords * LONGER_THAN_TYPICAL_FACTOR)) {
		problems.push({ label: `Much longer than the other comments here (about ${typicalWords} words)`, fixable: false });
	}
	return problems;
};

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
	/** Hard character limit for the text, e.g. a connection note. The answer is flagged when it goes over. */
	maxChars?: number;
	/** Word count of comparable text around the user (other comments). The answer is flagged when it's far longer. */
	typicalWords?: number;
};

type Step = "inputs" | "prompt" | "answer";

type AnswerControls = {
	backBtn: HTMLButtonElement;
	regenerateBtn: HTMLButtonElement;
	copyBtn: HTMLButtonElement;
	insertBtn?: HTMLButtonElement;
};

const STEP_LABELS: Record<Step, string> = { inputs: "Inputs", prompt: "Prompt", answer: "Answer" };

export const createTextModal = (
	text: string,
	title = "Your prompt is ready",
	subtitle = DEFAULT_SUBTITLE,
	{ generate = true, onBack, onInsert, maxChars, typicalWords }: TextModalOptions = {}
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
	const checks = el("div", { className: "la-checks", hidden: true });
	const refineBar = el("div", { className: "la-chips", role: "group", hidden: true });
	refineBar.setAttribute("aria-label", "Rewrite the answer");
	const content = el("div", { className: "la-field la-compose" }, [
		steps,
		el("div", { className: "la-field__header" }, [label, el("span", { className: "la-field__meta" }, [resetLink, stats])]),
		promptInput,
		answerPanel,
		checks,
		refineBar,
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
	/** True while a reply is streaming in. */
	let busy = false;

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

	/** Which provider Generate uses: a dropdown when several are saved, otherwise just its name. */
	const providerPicker = (): Node | string => {
		const providers = aiStatus?.providers ?? [];
		if (providers.length < 2) return `${aiStatus?.providerName} · ${aiStatus?.model}`;

		const picker = el(
			"select",
			{ className: "la-select la-select--inline" },
			providers.map((p) => new Option(`${p.name} · ${p.model}`, p.id, false, p.id === aiStatus?.activeId))
		);
		picker.setAttribute("aria-label", "Provider to generate with");
		picker.addEventListener("change", async () => {
			const status = await setActiveProvider(picker.value);
			if (status) {
				aiStatus = status;
				return;
			}
			picker.value = aiStatus?.activeId ?? "";
			showNotice("Couldn't switch provider", "The extension didn't respond. Reload the page and try again.");
		});
		return picker;
	};

	const enterPromptView = () => {
		stop();
		view = "prompt";
		label.textContent = generate ? "Prompt · editable" : "Details";
		promptInput.hidden = false;
		answerPanel.hidden = true;
		checks.hidden = true;
		refineBar.hidden = true;
		syncPromptMeta();
		renderSteps();
	};

	const createBackButton = (): HTMLButtonElement => {
		const backBtn = btn(onBack ? "Back" : "Close", "secondary");
		backBtn.addEventListener("click", onBack ? backToInputs : close);
		return backBtn;
	};

	const createPromptCopyButton = (canGenerate: boolean): HTMLButtonElement =>
		copyButton(getPrompt, generate ? "Copy prompt" : "Copy", canGenerate ? "secondary" : "primary");

	const showGenerateActions = (backBtn: HTMLButtonElement, copyBtn: HTMLButtonElement) => {
		const generateBtn = iconButton(SPARKLE_ICON, "Generate", "primary");
		generateBtn.addEventListener("click", () => showAnswer(true));
		hint.replaceChildren("Edit it if you like, then copy it or generate with ", providerPicker());
		actions.replaceChildren(backBtn, copyBtn, generateBtn);
		generateBtn.focus();
	};

	const showLocalActions = (backBtn: HTMLButtonElement, copyBtn: HTMLButtonElement) => {
		hint.replaceChildren(LOCAL_HINT);
		if (generate && aiStatus) {
			const setupLink = el("button", { type: "button", className: "la-link" }, ["Generate here instead"]);
			setupLink.addEventListener("click", openAiSettings);
			hint.append(" ", setupLink);
		}
		actions.replaceChildren(backBtn, copyBtn);
		copyBtn.focus();
	};

	const showPrompt = () => {
		enterPromptView();
		const canGenerate = Boolean(aiStatus?.configured);
		(canGenerate ? showGenerateActions : showLocalActions)(createBackButton(), createPromptCopyButton(canGenerate));
	};

	// --- Answer view ---

	const enterAnswerView = () => {
		label.textContent = `Answer · ${aiStatus?.providerName} · ${aiStatus?.model}`;
		promptInput.hidden = true;
		answerPanel.hidden = false;
		refineBar.hidden = false;
		resetLink.hidden = true;
		hint.textContent = `Sent to ${aiStatus?.host}. Read it before you post.`;
	};

	const createInsertButton = (): HTMLButtonElement | undefined => {
		if (!onInsert) return;
		const insertBtn = btn("Insert", "primary");
		insertBtn.addEventListener("click", () => {
			onInsert(answer);
			close();
		});
		return insertBtn;
	};

	const createAnswerControls = (): AnswerControls => {
		const backBtn = btn("Back to prompt", "secondary");
		backBtn.addEventListener("click", showPrompt);
		return {
			backBtn,
			regenerateBtn: btn("Regenerate", "secondary"),
			copyBtn: copyButton(() => answer, "Copy", onInsert ? "secondary" : "primary"),
			insertBtn: createInsertButton(),
		};
	};

	const fixPunctuationLink = (): HTMLButtonElement => {
		const fixBtn = el("button", { type: "button", className: "la-link" }, ["Fix punctuation"]);
		fixBtn.addEventListener("click", () => {
			answer = fixPunctuation(answer);
			answerPanel.textContent = answer;
			stats.textContent = describeLength(answer);
			renderChecks();
		});
		return fixBtn;
	};

	const problemNodes = (problems: SlopIssue[]): Node[] => [
		el("small", { className: "la-checks__title" }, ["Worth a look before you post"]),
		el(
			"ul",
			{ className: "la-checks__list" },
			problems.map((problem) => el("li", {}, [problem.label]))
		),
		...(problems.some((problem) => problem.fixable) ? [fixPunctuationLink()] : []),
	];

	const checkNodes = (problems: SlopIssue[]): Node[] =>
		problems.length ? problemNodes(problems) : [el("small", { className: "la-hint" }, ["No AI tells or length problems found."])];

	const showChecks = (problems: SlopIssue[]) => {
		checks.hidden = false;
		checks.dataset.state = problems.length ? "warn" : "ok";
		checks.replaceChildren(...checkNodes(problems));
	};

	/** Problems with the current answer: length, then AI tells, with a one-click fix for the mechanical ones. */
	const renderChecks = () => {
		if (busy || !answer) {
			checks.hidden = true;
			return;
		}
		showChecks([...findLengthProblems(answer, { maxChars, typicalWords }), ...findSlop(answer)]);
	};

	const renderRefineBar = () => {
		refineBar.replaceChildren(
			el("small", { className: "la-hint" }, ["Rewrite:"]),
			...REFINEMENTS.map(({ label: chipLabel, instruction }) => {
				const chip = el("button", { type: "button", className: "la-chip" }, [chipLabel]);
				chip.addEventListener("click", () => showAnswer(true, instruction));
				return chip;
			})
		);
	};

	/** Buttons that do nothing useful while a reply streams in or when there is no answer yet. */
	const lockableButtons = ({ copyBtn, insertBtn }: AnswerControls): HTMLButtonElement[] => [
		copyBtn,
		...(insertBtn ? [insertBtn] : []),
		...Array.from(refineBar.querySelectorAll("button")),
	];

	const setBusy = (controls: AnswerControls, value: boolean) => {
		busy = value;
		const locked = busy || !answer;
		controls.regenerateBtn.textContent = busy ? "Stop" : "Regenerate";
		for (const button of lockableButtons(controls)) button.disabled = locked;
		answerPanel.setAttribute("aria-busy", String(busy));
		renderChecks();
		renderSteps();
	};

	/** A rewrite that failed or was stopped before any text arrived leaves the earlier answer in place. */
	const restoreAnswer = (previousAnswer: string) => {
		if (!answer && previousAnswer) {
			answer = previousAnswer;
			answerPanel.textContent = answer;
		}
	};

	const focusAfterAnswer = ({ insertBtn, regenerateBtn }: AnswerControls) => {
		(insertBtn && !insertBtn.disabled ? insertBtn : regenerateBtn).focus();
	};

	const finishAnswer = (controls: AnswerControls, previousAnswer: string, message: string) => {
		stopGenerating = undefined;
		restoreAnswer(previousAnswer);
		setBusy(controls, false);
		stats.textContent = answer ? describeLength(answer) : message;
		focusAfterAnswer(controls);
	};

	const appendDelta = (delta: string) => {
		const atBottom = answerPanel.scrollHeight - answerPanel.scrollTop - answerPanel.clientHeight < SCROLL_FOLLOW_PX;
		answer += delta;
		answerPanel.textContent = answer;
		stats.textContent = describeLength(answer);
		if (atBottom) answerPanel.scrollTop = answerPanel.scrollHeight;
	};

	const startGeneration = (controls: AnswerControls, finish: (message: string) => void, refinement?: string) => {
		const requestPrompt = refinement ? buildRefinePrompt(getPrompt(), answer, refinement) : getPrompt();
		answer = "";
		answerPanel.textContent = "";
		stats.textContent = "Generating...";
		setBusy(controls, true);
		controls.regenerateBtn.focus();

		stopGenerating = generateReply(requestPrompt, {
			onDelta: appendDelta,
			onDone: () => finish("The server sent an empty answer."),
			onError: (message) => {
				finish("Failed");
				showNotice("Couldn't generate an answer", message);
			},
		});
	};

	/**
	 * Shows the answer view. `regenerate` starts a new request, otherwise the last answer is shown as is.
	 * `refinement` rewrites the current answer with that change instead of re-running the prompt.
	 */
	const showAnswer = (regenerate: boolean, refinement?: string) => {
		stop();
		view = "answer";
		busy = false;
		const previousAnswer = refinement ? answer : "";

		enterAnswerView();
		renderRefineBar();
		const controls = createAnswerControls();
		const finish = (message: string) => finishAnswer(controls, previousAnswer, message);
		controls.regenerateBtn.addEventListener("click", () => {
			if (!busy) {
				showAnswer(true);
				return;
			}
			stop();
			finish("Stopped");
		});
		actions.replaceChildren(controls.backBtn, controls.regenerateBtn, controls.copyBtn, ...(controls.insertBtn ? [controls.insertBtn] : []));

		if (!regenerate) {
			answerPanel.textContent = answer;
			finish("");
			return;
		}
		startGeneration(controls, finish, refinement);
	};

	showPrompt();
	if (!generate) return;
	getAiStatus().then((status) => {
		aiStatus = status;
		if (view === "prompt" && promptInput.isConnected) showPrompt();
	});
};

/**
 * Form pieces shared by the prompt modals that write about a post (comment, repost with thoughts):
 * the post preview, "your take" field, tone and length pills, fact-check switch and footer.
 */
import type { Emotion } from "../lib";
import { ALLOWED_EMOTIONS } from "../lib";
import { el, modalButtons, modalFooter, pillGroup, textArea, toggleSwitch } from "./components";

const DEFAULT_EMOTION: Emotion = "thoughtful";

// Word limits offered as pills; "any" means no limit.
const LENGTH_OPTIONS = [
	{ value: "any", label: "No limit" },
	{ value: "25", label: "Short · 25 words" },
	{ value: "50", label: "Medium · 50" },
	{ value: "100", label: "Long · 100" },
] as const;
type LengthOption = (typeof LENGTH_OPTIONS)[number]["value"];

const toEmotionLabel = (emotion: string): string => emotion.charAt(0).toUpperCase() + emotion.slice(1);

/** The post, clamped to three lines with a toggle to read it in full. */
export const postPreview = (postText: string, label = "The post"): HTMLDivElement => {
	const toggle = el("button", { type: "button", className: "la-post-preview__toggle" }, ["Show full post"]);
	const preview = el("div", { className: "la-post-preview la-post-preview--clamped" }, [
		el("span", { className: "la-label" }, [label]),
		el("div", { className: "la-post-preview__text" }, [postText]),
		toggle,
	]);
	toggle.addEventListener("click", () => {
		const clamped = preview.classList.toggle("la-post-preview--clamped");
		toggle.textContent = clamped ? "Show full post" : "Show less";
	});
	// Once laid out, drop the toggle for posts short enough to fit in the clamped lines.
	requestAnimationFrame(() => {
		const text = preview.querySelector(".la-post-preview__text");
		if (text && text.scrollHeight <= text.clientHeight) toggle.hidden = true;
	});
	return preview;
};

/** The highlighted "Your take" field, the input that shapes the generated text most. */
export const yourTakeField = (hint: string, placeholder: string): { el: HTMLDivElement; input: HTMLTextAreaElement } => {
	const input = textArea("", false, placeholder);
	input.rows = 4;
	input.classList.add("la-textarea--primary");
	const wrapper = el("div", { className: "la-field" }, [
		el("div", { className: "la-field__header" }, [el("label", { className: "la-label" }, ["Your take"]), el("small", { className: "la-hint" }, [hint])]),
		input,
	]);
	return { el: wrapper, input };
};

export const toneGroup = () =>
	pillGroup<Emotion>(
		"Tone",
		ALLOWED_EMOTIONS.map((emotion) => ({ value: emotion, label: toEmotionLabel(emotion) })),
		DEFAULT_EMOTION,
		"How it should come across"
	);

/** Word-limit pills; `getWords()` is undefined for "No limit". */
export const lengthGroup = (hint: string) => {
	const group = pillGroup<LengthOption>("Length", LENGTH_OPTIONS, "any", hint);
	return {
		el: group.el,
		getWords: (): number | undefined => {
			const value = group.getValue();
			return value === "any" ? undefined : Number.parseInt(value, 10);
		},
	};
};

/**
 * Fact-check switch (on by default) plus the optional extra-instructions box.
 * The prompt builders turn `isFactCheckOn()` into the fact-check section.
 */
export const instructionsFields = (subject: string, placeholder: string) => {
	const factCheck = toggleSwitch("Ask for a quick fact check", `The AI checks the topic online so the ${subject} stays accurate`, true);
	const extra = textArea("", false, placeholder);
	extra.rows = 2;
	const extraField = el("div", { className: "la-field" }, [el("label", { className: "la-label" }, ["Extra instructions (optional)"]), extra]);

	return {
		factCheckEl: factCheck.el,
		extraEl: extraField,
		isFactCheckOn: (): boolean => factCheck.isOn(),
		getExtraInstructions: (): string | undefined => extra.value.trim() || undefined,
	};
};

/** Footer with a short hint on the left and Cancel / submit on the right. */
export const composeFooter = (hint: string, submitLabel: string, onCancel: () => void, formId: string): HTMLElement =>
	modalFooter([
		el("div", { className: "la-modal__footer-row" }, [el("small", { className: "la-hint" }, [hint]), modalButtons("Cancel", submitLabel, onCancel, formId)]),
	]);

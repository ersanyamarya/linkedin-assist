import type { Formality, Intent, Length, Messages, Tone } from "../lib";
import { ALLOWED_FORMALITIES, ALLOWED_INTENTS, ALLOWED_LENGTHS, ALLOWED_TONES, normalizeWhitespace } from "../lib";
import type { MessagePromptOptions } from "../prompt";
import {
	el,
	field,
	fieldRow,
	modalButtons,
	modalFooter,
	modalForm,
	pillGroup,
	radioGroup,
	select,
	showModal,
	textArea,
	toggleSwitch,
	updateOptions,
} from "./components";

type MessageReplyMode = "preset" | "prompt";

export type MessageReplyPreset = {
	readonly id: string;
	readonly label: string;
	readonly template: string;
};

type MessageReplyModalResult = {
	readonly mode: MessageReplyMode;
	readonly text: string;
};

type MessageReplyModalArgs = {
	readonly data: Messages;
	readonly buildPrompt: (data: Messages, options: MessagePromptOptions) => string;
	readonly onSubmit: (result: MessageReplyModalResult) => void;
};

const SIGNATURE_REGARDS = "Regards,\nSanyam Arya";
const SIGNATURE_BEST = "Best, Sanyam";

export const MESSAGE_REPLY_PRESETS: readonly MessageReplyPreset[] = [
	{
		id: "nohelp",
		label: "No help needed",
		template: `Hi {name},\n\nThanks for reaching out. I don't need this right now, but I'll keep your info handy if that changes.\n\n${SIGNATURE_REGARDS}`,
	},
	{
		id: "nohire",
		label: "Not hiring",
		template: `Hi {name},\n\nAppreciate you thinking of us. We're not hiring at the moment, but I'll reach out the second that shifts.\n\n${SIGNATURE_REGARDS}`,
	},
	{
		id: "connect",
		label: "Happy to connect",
		template: `Hi {name},\n\nGood to connect. Looking forward to seeing what you're up to.\n\n${SIGNATURE_REGARDS}`,
	},
	{
		id: "reject",
		label: "Not seeking opportunities",
		template: `Hi {name},\n\nThanks for the note. I'm not looking right now, but I'll keep you in mind if that changes.\n\n${SIGNATURE_REGARDS}`,
	},
	{
		id: "notyet",
		label: "Not yet",
		template: `Hi {name},\n\nThanks for your patience. We're heads-down on other priorities right now, so check back in a couple months.\n\n${SIGNATURE_BEST}`,
	},
	{
		id: "nopermanent",
		label: "Polite no, permanently",
		template: `Hi {name},\n\nThanks for thinking of me, but this isn't something I'm looking for. Best of luck.\n\n${SIGNATURE_REGARDS}`,
	},
];

const uniqueNames = (names: readonly string[]): readonly string[] => {
	const seen = new Set<string>();
	return names.filter((name) => {
		const key = normalizeWhitespace(name);
		if (!key || seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const collectParticipants = (data: Messages): readonly string[] => {
	const messageNames = data.messages.map((m) => normalizeWhitespace(m.sender)).filter((n) => n.length > 0);
	const senderName = normalizeWhitespace(data.senderName);
	return uniqueNames([...messageNames, senderName].filter((n) => n.length > 0));
};

export const applyMessageTemplate = (template: string, name: string): string => template.replace(/\{name\}/g, name || "there");

const TONE_HINT = "How it should feel";
const LENGTH_HINT = "Roughly how long";
const INTENT_HINT = "What the reply is for";
const FORMALITY_HINT = "How formal";

const SUBMIT_LABELS: Record<MessageReplyMode, string> = { preset: "Insert reply", prompt: "Generate prompt" };
const FOOTER_HINTS: Record<MessageReplyMode, string> = {
	preset: "Goes into the message box. Nothing is sent.",
	prompt: "Opens the prompt, ready to copy.",
};

const HYPHENS = /-/g;

// "follow-up" → "Follow up", "qualify-lead" → "Qualify lead"
const toOptionLabel = (value: string): string => {
	const words = value.replace(HYPHENS, " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
};

const toOptions = <T extends string>(values: readonly T[]) => values.map((value) => ({ value, label: toOptionLabel(value) }));

/** The latest message from `name`, falling back to the latest message in the thread. */
const latestMessageFrom = (data: Messages, name: string) => {
	const fromName = data.messages.filter((m) => normalizeWhitespace(m.sender) === normalizeWhitespace(name));
	return fromName.at(-1) ?? data.messages.at(-1);
};

/** Card showing who you're replying to and what they last said, so the context stays in view. */
const contextCard = () => {
	const avatar = el("div", { className: "la-reply-context__avatar" });
	avatar.setAttribute("aria-hidden", "true");
	const title = el("div", { className: "la-reply-context__title" });
	const message = el("div", { className: "la-reply-context__message" });
	const card = el("div", { className: "la-reply-context" }, [avatar, el("div", { className: "la-reply-context__text" }, [title, message])]);

	const update = (data: Messages, recipient: string) => {
		const latest = latestMessageFrom(data, recipient);
		const sender = normalizeWhitespace(latest?.sender) || recipient;
		card.hidden = !latest?.text;
		avatar.textContent = sender.charAt(0).toUpperCase();
		title.textContent = `${sender} wrote`;
		message.textContent = latest?.text ?? "";
	};
	return { el: card, update };
};

/**
 * Creates a modal for replying to LinkedIn message threads: either a preset reply inserted into
 * the message box, or a prompt for an LLM built from tone, length, intent and formality.
 */
export const createMessageReplyModal = (args: MessageReplyModalArgs): void => {
	const { data, buildPrompt, onSubmit } = args;

	const participants = collectParticipants(data);
	const senderName = normalizeWhitespace(data.senderName);
	const isSingle = participants.length === 1;

	// Default names
	const defaultYourName = participants.find((n) => normalizeWhitespace(n) !== senderName) ?? "";
	const defaultRecipient = senderName || (participants.find((n) => n !== defaultYourName) ?? "");

	// Name selects
	const yourNameSelect = select(participants, isSingle ? "" : defaultYourName);
	const recipientSelect = select(isSingle ? participants : participants.filter((n) => n !== defaultYourName), isSingle ? participants[0] : defaultRecipient);
	if (isSingle) {
		yourNameSelect.disabled = true;
		yourNameSelect.value = "";
		recipientSelect.disabled = true;
	}

	const context = contextCard();

	// Mode toggle
	const modeGroup = radioGroup<MessageReplyMode>(
		"Reply type",
		[
			{ value: "preset", label: "Preset reply" },
			{ value: "prompt", label: "Generate a prompt" },
		],
		"preset"
	);

	// Preset controls
	const presetGroup = pillGroup(
		"Pick a preset",
		MESSAGE_REPLY_PRESETS.map((p) => ({ value: p.id, label: p.label })),
		MESSAGE_REPLY_PRESETS[0]?.id ?? ""
	);
	const presetPreview = textArea("");
	presetPreview.rows = 7;
	const charCount = el("small", { className: "la-hint" });
	const presetPreviewSection = el("div", { className: "la-field" }, [
		el("div", { className: "la-field__header" }, [el("label", { className: "la-label" }, ["Message"]), charCount]),
		presetPreview,
	]);
	const presetSection = el("div", { className: "la-compose__section" }, [presetGroup.el, presetPreviewSection]);

	// Prompt controls
	const toneGroup = pillGroup<Tone>("Tone", toOptions(ALLOWED_TONES), ALLOWED_TONES[0], TONE_HINT);
	const lengthGroup = pillGroup<Length>("Length", toOptions(ALLOWED_LENGTHS), ALLOWED_LENGTHS[0], LENGTH_HINT);
	const intentGroup = pillGroup<Intent>("Intent", toOptions(ALLOWED_INTENTS), ALLOWED_INTENTS[0], INTENT_HINT);
	const formalityGroup = pillGroup<Formality>("Formality", toOptions(ALLOWED_FORMALITIES), "medium", FORMALITY_HINT);
	const ctaSwitch = toggleSwitch("Include a call-to-action", "Ends the reply with a clear next step");
	const extraInstructions = textArea("", false, "e.g. mention I'm free next Tuesday afternoon");
	extraInstructions.rows = 3;
	const promptSection = el("div", { className: "la-compose__section" }, [
		toneGroup.el,
		lengthGroup.el,
		intentGroup.el,
		formalityGroup.el,
		ctaSwitch.el,
		field("Extra instructions (optional)", extraInstructions),
	]);

	const footerHint = el("small", { className: "la-hint" });

	// Visibility toggle
	const updateVisibility = () => {
		const mode = modeGroup.getValue();
		presetSection.hidden = mode !== "preset";
		promptSection.hidden = mode !== "prompt";
		submitBtn.textContent = SUBMIT_LABELS[mode];
		footerHint.textContent = FOOTER_HINTS[mode];
	};

	const updateCharCount = () => {
		charCount.textContent = `${presetPreview.value.length} characters · edit freely`;
	};

	// Picking a preset replaces whatever was typed in the message box.
	const updatePreview = () => {
		const preset = MESSAGE_REPLY_PRESETS.find((p) => p.id === presetGroup.getValue()) ?? MESSAGE_REPLY_PRESETS[0];
		presetPreview.value = applyMessageTemplate(preset?.template ?? "", recipientSelect.value);
		updateCharCount();
	};

	const updateRecipient = () => {
		context.update(data, recipientSelect.value || senderName);
		updatePreview();
	};

	// Wire events
	yourNameSelect.addEventListener("change", () => {
		const available = participants.filter((n) => n !== yourNameSelect.value);
		updateOptions(recipientSelect, available, available[0] ?? "");
		updateRecipient();
	});
	recipientSelect.addEventListener("change", updateRecipient);
	presetGroup.el.addEventListener("change", updatePreview);
	presetPreview.addEventListener("input", updateCharCount);
	modeGroup.el.addEventListener("change", updateVisibility);

	let closeModal: () => void = () => {};

	const form = modalForm(
		[context.el, fieldRow(field("You are", yourNameSelect), field("Replying to", recipientSelect)), modeGroup.el, presetSection, promptSection],
		(event) => {
			event.preventDefault();
			const mode = modeGroup.getValue();
			const recipientName = recipientSelect.value || senderName;

			if (mode === "preset") {
				onSubmit({ mode, text: presetPreview.value.trim() });
				closeModal();
				return;
			}

			const options: MessagePromptOptions = {
				currentUserName: normalizeWhitespace(yourNameSelect.value) || undefined,
				recipientName: normalizeWhitespace(recipientName) || undefined,
				tone: toneGroup.getValue(),
				length: lengthGroup.getValue(),
				intent: intentGroup.getValue(),
				formality: formalityGroup.getValue(),
				includeCTA: ctaSwitch.isOn() || undefined,
				extraInstructions: normalizeWhitespace(extraInstructions.value) || undefined,
			};

			onSubmit({ mode, text: buildPrompt(data, options) });
			closeModal();
		}
	);
	form.classList.add("la-compose");

	const footer = modalFooter([
		el("div", { className: "la-modal__footer-row" }, [footerHint, modalButtons("Cancel", SUBMIT_LABELS.preset, () => closeModal(), form.id)]),
	]);
	const submitBtn = footer.querySelector('button[type="submit"]') as HTMLButtonElement;

	// Initialize
	updateRecipient();
	updateVisibility();

	const { close } = showModal("Reply to message", [form], footer);
	closeModal = close;
};

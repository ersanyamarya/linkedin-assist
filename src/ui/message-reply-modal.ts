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
	/** `reopen` brings this form back, as the user left it (used after a prompt, not a preset). */
	readonly onSubmit: (result: MessageReplyModalResult, reopen: () => void) => void;
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

/** Who "You are" and "Replying to" start as: you are the participant who isn't the thread's sender. */
const defaultNames = (participants: readonly string[], senderName: string) => {
	const yourName = participants.find((n) => normalizeWhitespace(n) !== senderName) ?? "";
	const recipient = senderName || (participants.find((n) => n !== yourName) ?? "");
	return { yourName, recipient };
};

/** In a one-person thread there is nothing to choose: "You are" stays blank and both selects are locked. */
const createSingleNameSelects = (participants: readonly string[]) => {
	const yourNameSelect = select(participants, "");
	yourNameSelect.disabled = true;
	yourNameSelect.value = "";
	const recipientSelect = select(participants, participants[0]);
	recipientSelect.disabled = true;
	return { yourNameSelect, recipientSelect };
};

const createNameSelects = (participants: readonly string[], senderName: string) => {
	if (participants.length === 1) return createSingleNameSelects(participants);
	const { yourName, recipient } = defaultNames(participants, senderName);
	return {
		yourNameSelect: select(participants, yourName),
		recipientSelect: select(
			participants.filter((n) => n !== yourName),
			recipient
		),
	};
};

const createModeGroup = () =>
	radioGroup<MessageReplyMode>(
		"Reply type",
		[
			{ value: "preset", label: "Preset reply" },
			{ value: "prompt", label: "Generate a prompt" },
		],
		"preset"
	);

const createPresetControls = () => {
	const group = pillGroup(
		"Pick a preset",
		MESSAGE_REPLY_PRESETS.map((p) => ({ value: p.id, label: p.label })),
		MESSAGE_REPLY_PRESETS[0]?.id ?? ""
	);
	const preview = textArea("");
	preview.rows = 7;
	const charCount = el("small", { className: "la-hint" });
	const updateCharCount = () => {
		charCount.textContent = `${preview.value.length} characters · edit freely`;
	};
	preview.addEventListener("input", updateCharCount);
	const previewSection = el("div", { className: "la-field" }, [
		el("div", { className: "la-field__header" }, [el("label", { className: "la-label" }, ["Message"]), charCount]),
		preview,
	]);
	const section = el("div", { className: "la-compose__section" }, [group.el, previewSection]);
	return { group, preview, section, updateCharCount };
};

const createPromptControls = () => {
	const tone = pillGroup<Tone>("Tone", toOptions(ALLOWED_TONES), ALLOWED_TONES[0], TONE_HINT);
	const length = pillGroup<Length>("Length", toOptions(ALLOWED_LENGTHS), ALLOWED_LENGTHS[0], LENGTH_HINT);
	const intent = pillGroup<Intent>("Intent", toOptions(ALLOWED_INTENTS), ALLOWED_INTENTS[0], INTENT_HINT);
	const formality = pillGroup<Formality>("Formality", toOptions(ALLOWED_FORMALITIES), "medium", FORMALITY_HINT);
	const cta = toggleSwitch("Include a call-to-action", "Ends the reply with a clear next step");
	const extraInstructions = textArea("", false, "e.g. mention I'm free next Tuesday afternoon");
	extraInstructions.rows = 3;
	const section = el("div", { className: "la-compose__section" }, [
		tone.el,
		length.el,
		intent.el,
		formality.el,
		cta.el,
		field("Extra instructions (optional)", extraInstructions),
	]);
	return { tone, length, intent, formality, cta, extraInstructions, section };
};

type PromptControls = ReturnType<typeof createPromptControls>;

const orUndefined = (value: string): string | undefined => normalizeWhitespace(value) || undefined;

const buildPromptOptions = (controls: PromptControls, yourName: string, recipientName: string): MessagePromptOptions => ({
	currentUserName: orUndefined(yourName),
	recipientName: orUndefined(recipientName),
	tone: controls.tone.getValue(),
	length: controls.length.getValue(),
	intent: controls.intent.getValue(),
	formality: controls.formality.getValue(),
	includeCTA: controls.cta.isOn() || undefined,
	extraInstructions: orUndefined(controls.extraInstructions.value),
});

/** Template text for the preset with this id, or the first preset's. */
const presetTemplate = (id: string): string => (MESSAGE_REPLY_PRESETS.find((p) => p.id === id) ?? MESSAGE_REPLY_PRESETS[0])?.template ?? "";

/**
 * Creates a modal for replying to LinkedIn message threads: either a preset reply inserted into
 * the message box, or a prompt for an LLM built from tone, length, intent and formality.
 */
export const createMessageReplyModal = ({ data, buildPrompt, onSubmit }: MessageReplyModalArgs): void => {
	const participants = collectParticipants(data);
	const senderName = normalizeWhitespace(data.senderName);
	const { yourNameSelect, recipientSelect } = createNameSelects(participants, senderName);
	const context = contextCard();
	const modeGroup = createModeGroup();
	const preset = createPresetControls();
	const prompt = createPromptControls();
	const footerHint = el("small", { className: "la-hint" });

	const updateVisibility = () => {
		const mode = modeGroup.getValue();
		preset.section.hidden = mode !== "preset";
		prompt.section.hidden = mode !== "prompt";
		submitBtn.textContent = SUBMIT_LABELS[mode];
		footerHint.textContent = FOOTER_HINTS[mode];
	};

	// Picking a preset replaces whatever was typed in the message box.
	const updatePreview = () => {
		preset.preview.value = applyMessageTemplate(presetTemplate(preset.group.getValue()), recipientSelect.value);
		preset.updateCharCount();
	};

	const updateRecipient = () => {
		context.update(data, recipientSelect.value || senderName);
		updatePreview();
	};

	yourNameSelect.addEventListener("change", () => {
		const available = participants.filter((n) => n !== yourNameSelect.value);
		updateOptions(recipientSelect, available, available[0] ?? "");
		updateRecipient();
	});
	recipientSelect.addEventListener("change", updateRecipient);
	preset.group.el.addEventListener("change", updatePreview);
	modeGroup.el.addEventListener("change", updateVisibility);

	let modal: { close: () => void; hide: () => void; show: () => void } | undefined;

	const form = modalForm(
		[context.el, fieldRow(field("You are", yourNameSelect), field("Replying to", recipientSelect)), modeGroup.el, preset.section, prompt.section],
		(event) => {
			event.preventDefault();
			if (!modal) return;
			const { close, hide, show } = modal;

			if (modeGroup.getValue() === "preset") {
				onSubmit({ mode: "preset", text: preset.preview.value.trim() }, show);
				close();
				return;
			}

			const options = buildPromptOptions(prompt, yourNameSelect.value, recipientSelect.value || senderName);
			onSubmit({ mode: "prompt", text: buildPrompt(data, options) }, show);
			hide();
		}
	);
	form.classList.add("la-compose");

	const footer = modalFooter([
		el("div", { className: "la-modal__footer-row" }, [footerHint, modalButtons("Cancel", SUBMIT_LABELS.preset, () => modal?.close(), form.id)]),
	]);
	const submitBtn = footer.querySelector('button[type="submit"]') as HTMLButtonElement;

	updateRecipient();
	updateVisibility();

	modal = showModal("Reply to message", [form], footer);
};

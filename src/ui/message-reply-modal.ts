import type { Formality, Intent, Length, Messages, Tone } from "../lib";
import { ALLOWED_FORMALITIES, ALLOWED_INTENTS, ALLOWED_LENGTHS, ALLOWED_TONES } from "../lib";
import type { MessagePromptOptions } from "../prompt";
import { checkbox, field, fieldRow, modalButtons, modalFooter, modalForm, radioGroup, select, showModal, textArea, updateOptions } from "./components";

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
		template: `Hello {name},\n\nThanks for connecting!\n\nWhile I don't currently have an immediate need for your services, I'll keep your information in mind should anything change.\n\n${SIGNATURE_REGARDS}`,
	},
	{
		id: "nohire",
		label: "Not hiring",
		template: `Hi {name},\n\nThanks for connecting!\n\nWhile we're not actively hiring currently, I'll be sure to reach out if our needs evolve.\n\n${SIGNATURE_REGARDS}`,
	},
	{
		id: "connect",
		label: "Happy to connect",
		template: `Hi {name},\n\nI am happy to connect with you. Looking forward to our interactions.\n\n${SIGNATURE_REGARDS}`,
	},
	{
		id: "reject",
		label: "Not seeking opportunities",
		template: `Hi {name},\n\nThanks for reaching out! While I'm not actively seeking new opportunities right now, I'll be sure to reach out if that changes.\n\n${SIGNATURE_REGARDS}`,
	},
	{
		id: "notyet",
		label: "Not yet",
		template: `Hi {name}, \n\nThank you for your interest.\n\nWe're currently focused on existing priorities, but feel free to check back in a few months.\n\n${
			/* `SIGNATURE_BEST` is a constant string that contains a signature typically used at the end of a message. In this case, it includes the closing "Best," followed by the name "Sanyam". It is used as part of the message templates in the `MESSAGE_REPLY_PRESETS` array to provide a consistent signature for certain types of replies. */
			SIGNATURE_BEST
		}`,
	},
];

const normalize = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();

const uniqueNames = (names: readonly string[]): readonly string[] => {
	const seen = new Set<string>();
	return names.filter((name) => {
		const key = normalize(name);
		if (!key || seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const collectParticipants = (data: Messages): readonly string[] => {
	const messageNames = data.messages.map((m) => normalize(m.sender)).filter((n) => n.length > 0);
	const senderName = normalize(data.senderName);
	return uniqueNames([...messageNames, senderName].filter((n) => n.length > 0));
};

export const applyMessageTemplate = (template: string, name: string): string => template.replace(/\{name\}/g, name || "there");

/**
 * Creates a modal for replying to LinkedIn message threads.
 */
export const createMessageReplyModal = (args: MessageReplyModalArgs): void => {
	const { data, buildPrompt, onSubmit } = args;

	const participants = collectParticipants(data);
	const senderName = normalize(data.senderName);
	const isSingle = participants.length === 1;

	// Default names
	const defaultYourName = participants.find((n) => normalize(n) !== senderName) ?? "";
	const defaultRecipient = senderName || (participants.find((n) => n !== defaultYourName) ?? "");

	// Name selects
	const yourNameSelect = select(participants, isSingle ? "" : defaultYourName);
	const recipientSelect = select(isSingle ? participants : participants.filter((n) => n !== defaultYourName), isSingle ? participants[0] : defaultRecipient);
	if (isSingle) {
		yourNameSelect.disabled = true;
		yourNameSelect.value = "";
		recipientSelect.disabled = true;
	}

	// Mode toggle
	const modeGroup = radioGroup<MessageReplyMode>(
		"Reply type",
		[
			{ value: "preset", label: "Use a preset reply" },
			{ value: "prompt", label: "Generate a prompt" },
		],
		"preset"
	);

	// Preset controls
	const presetSelect = select(
		MESSAGE_REPLY_PRESETS.map((p) => p.label),
		MESSAGE_REPLY_PRESETS[0]?.label
	);
	const presetPreview = textArea("");

	// Prompt controls
	const toneSelect = select(ALLOWED_TONES as unknown as string[]);
	const lengthSelect = select(ALLOWED_LENGTHS as unknown as string[]);
	const intentSelect = select(ALLOWED_INTENTS as unknown as string[]);
	const formalitySelect = select(ALLOWED_FORMALITIES as unknown as string[]);
	const ctaCheckbox = checkbox("Include a call-to-action", false);
	const extraInstructions = textArea("", false, "Optional extra instructions");

	// Preset/prompt sections
	const presetSection = field("Preset", presetSelect);
	const presetPreviewSection = field("Preset preview", presetPreview, "Edit if you want to tweak the message");
	const promptOptionsRow = fieldRow(
		field("Tone", toneSelect, "How should the tone feel?"),
		field("Length", lengthSelect, "How long should the reply be?"),
		field("Intent", intentSelect, "What's the goal?"),
		field("Formality", formalitySelect, "How formal?")
	);
	const ctaSection = field("Call-to-action", ctaCheckbox.el, "Optional: Add a clear next step");
	const instructionsSection = field("Extra instructions", extraInstructions, "Optional: Additional LLM guidance");

	const submitLabelForMode = (mode: MessageReplyMode): string => (mode === "preset" ? "Use this reply" : "Generate prompt");

	// Visibility toggle
	const updateVisibility = () => {
		const isPreset = modeGroup.getValue() === "preset";
		presetSection.style.display = isPreset ? "" : "none";
		presetPreviewSection.style.display = isPreset ? "" : "none";
		promptOptionsRow.style.display = isPreset ? "none" : "";
		ctaSection.style.display = isPreset ? "none" : "";
		instructionsSection.style.display = isPreset ? "none" : "";
		submitBtn.textContent = submitLabelForMode(modeGroup.getValue());
	};

	// Update preview
	const updatePreview = () => {
		const preset = MESSAGE_REPLY_PRESETS.find((p) => p.label === presetSelect.value) ?? MESSAGE_REPLY_PRESETS[0];
		presetPreview.value = applyMessageTemplate(preset?.template ?? "", recipientSelect.value);
	};

	// Wire events
	yourNameSelect.addEventListener("change", () => {
		const available = participants.filter((n) => n !== yourNameSelect.value);
		updateOptions(recipientSelect, available, available[0] ?? "");
		updatePreview();
	});
	recipientSelect.addEventListener("change", updatePreview);
	presetSelect.addEventListener("change", updatePreview);
	modeGroup.el.addEventListener("change", updateVisibility);

	// Initialize
	updatePreview();

	let closeModal: () => void = () => {};

	const form = modalForm(
		[
			fieldRow(field("You are", yourNameSelect, "Select your name"), field("Address", recipientSelect, "Who is the reply for?")),
			modeGroup.el,
			presetSection,
			presetPreviewSection,
			promptOptionsRow,
			ctaSection,
			instructionsSection,
		],
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
				currentUserName: normalize(yourNameSelect.value) || undefined,
				recipientName: normalize(recipientName) || undefined,
				tone: (toneSelect.value as Tone) || undefined,
				length: (lengthSelect.value as Length) || undefined,
				intent: (intentSelect.value as Intent) || undefined,
				formality: (formalitySelect.value as Formality) || undefined,
				includeCTA: ctaCheckbox.input.checked || undefined,
				extraInstructions: normalize(extraInstructions.value) || undefined,
			};

			onSubmit({ mode, text: buildPrompt(data, options) });
			closeModal();
		}
	);

	const footer = modalFooter([modalButtons("Cancel", submitLabelForMode(modeGroup.getValue()), () => closeModal(), form.id)]);
	const submitBtn = footer.querySelector('button[type="submit"]') as HTMLButtonElement;
	updateVisibility();

	const { close } = showModal("Reply to LinkedIn message", [form], footer);
	closeModal = close;
};

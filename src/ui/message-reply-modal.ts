import type { Messages } from "../lib";
import { UI } from "../lib";
import type { MessagePromptOptions } from "../prompt";
import {
	createModalBackdrop,
	createModalButtons,
	createModalContainer,
	createModeToggle,
	createReplyTypeSection,
	createSection,
	createSelect,
	createTextArea,
	createTwoColumnSection,
	updateSelectOptions,
} from "./components";

type MessageReplyMode = "preset" | "prompt";

type MessageReplyPreset = {
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

const MESSAGE_REPLY_PRESETS: readonly MessageReplyPreset[] = [
	{
		id: "thanks-connect",
		label: "Thanks for reaching out",
		template: "Thanks for reaching out, {name}! Happy to connect.",
	},
	{
		id: "follow-up",
		label: "Follow up",
		template: "Appreciate the note, {name}. I’ll take a look and get back to you shortly.",
	},
	{
		id: "schedule",
		label: "Schedule a chat",
		template: "Thanks, {name}! What’s the best time for a quick chat?",
	},
];

const normalizeWhitespace = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();

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
	const messageNames = data.messages.map((message) => normalizeWhitespace(message.sender)).filter((name) => name.length > 0);
	const senderName = normalizeWhitespace(data.senderName);
	return uniqueNames([...messageNames, senderName].filter((name) => name.length > 0));
};

const pickDefaultYourName = (participants: readonly string[], senderName: string): string =>
	participants.find((name) => normalizeWhitespace(name) !== normalizeWhitespace(senderName)) ?? participants[0] ?? "";

const pickDefaultRecipientName = (participants: readonly string[], yourName: string, senderName: string): string => {
	const normalizedSender = normalizeWhitespace(senderName);
	const fallback = participants.find((name) => normalizeWhitespace(name) !== normalizeWhitespace(yourName)) ?? "";
	return normalizedSender || fallback;
};

const applyPresetTemplate = (template: string, recipientName: string): string => template.replace(/\{name\}/g, recipientName || "there");

const createPresetSelect = (presets: readonly MessageReplyPreset[]): HTMLSelectElement => {
	const select = document.createElement("select");
	select.className = UI.CLASSES.MODAL_SELECT;
	for (const preset of presets) {
		const option = document.createElement("option");
		option.value = preset.id;
		option.textContent = preset.label;
		select.appendChild(option);
	}
	select.value = presets[0]?.id ?? "";
	return select;
};

const getSelectedMode = (inputs: readonly HTMLInputElement[]): MessageReplyMode =>
	(inputs.find((input) => input.checked)?.value as MessageReplyMode | undefined) ?? "preset";

const buildPromptOptions = (yourName: string, recipientName: string, extraInstructions: string): MessagePromptOptions => ({
	currentUserName: normalizeWhitespace(yourName) || undefined,
	recipientName: normalizeWhitespace(recipientName) || undefined,
	extraInstructions: normalizeWhitespace(extraInstructions) || undefined,
});

const updatePresetPreview = (presetSelect: HTMLSelectElement, recipientName: string, output: HTMLTextAreaElement) => {
	const preset = MESSAGE_REPLY_PRESETS.find((item) => item.id === presetSelect.value) ?? MESSAGE_REPLY_PRESETS[0];
	output.value = applyPresetTemplate(preset?.template ?? "", recipientName);
};

const createModeControls = (): {
	readonly container: HTMLDivElement;
	readonly inputs: readonly HTMLInputElement[];
} => {
	const container = document.createElement("div");
	container.className = UI.CLASSES.MODAL_LIST;

	const presetToggle = createModeToggle("message-reply-mode", "preset", "Use a preset reply", true);
	const promptToggle = createModeToggle("message-reply-mode", "prompt", "Generate a prompt", false);

	container.appendChild(presetToggle.row);
	container.appendChild(promptToggle.row);

	return { container, inputs: [presetToggle.input, promptToggle.input] };
};

const createPresetControls = (): {
	readonly select: HTMLSelectElement;
	readonly preview: HTMLTextAreaElement;
} => {
	const select = createPresetSelect(MESSAGE_REPLY_PRESETS);
	const preview = createTextArea("");
	return { select, preview };
};

const createPromptControls = (): HTMLTextAreaElement => {
	const textarea = createTextArea("");
	textarea.placeholder = "Optional extra instructions";
	return textarea;
};

const buildModalState = (data: Messages) => {
	const participants = collectParticipants(data);
	const senderName = normalizeWhitespace(data.senderName);
	const defaultYourName = pickDefaultYourName(participants, senderName);
	const defaultRecipientName = pickDefaultRecipientName(participants, defaultYourName, senderName);

	return { participants, senderName, defaultYourName, defaultRecipientName };
};

const createReplySelects = (participants: readonly string[], defaultYourName: string, defaultRecipientName: string, senderName: string) => {
	const isSingleParticipant = participants.length === 1;
	const onlyName = participants[0] ?? "";
	const yourNameSelect = createSelect(participants, isSingleParticipant ? onlyName : defaultYourName);
	const recipientOptions = isSingleParticipant ? [onlyName] : participants.filter((name) => name !== defaultYourName);
	const recipientSelect = createSelect(recipientOptions, isSingleParticipant ? onlyName : defaultRecipientName || senderName);

	if (isSingleParticipant) {
		yourNameSelect.disabled = true;
		recipientSelect.disabled = true;
	}

	return { yourNameSelect, recipientSelect };
};

const wirePresetUpdates = (
	participants: readonly string[],
	yourNameSelect: HTMLSelectElement,
	recipientSelect: HTMLSelectElement,
	presetSelect: HTMLSelectElement,
	presetPreview: HTMLTextAreaElement
) => {
	const refreshRecipient = () => {
		const availableRecipients = participants.filter((name) => name !== yourNameSelect.value);
		updateSelectOptions(recipientSelect, availableRecipients, availableRecipients[0] ?? "");
	};

	const refreshPresetPreview = () => updatePresetPreview(presetSelect, recipientSelect.value, presetPreview);

	yourNameSelect.addEventListener("change", () => {
		refreshRecipient();
		refreshPresetPreview();
	});
	recipientSelect.addEventListener("change", refreshPresetPreview);
	presetSelect.addEventListener("change", refreshPresetPreview);
};

const handleSubmit = (
	event: SubmitEvent,
	data: Messages,
	inputs: readonly HTMLInputElement[],
	selects: { readonly yourNameSelect: HTMLSelectElement; readonly recipientSelect: HTMLSelectElement },
	controls: { readonly presetPreview: HTMLTextAreaElement; readonly promptInstructions: HTMLTextAreaElement },
	context: { readonly senderName: string },
	buildPrompt: (data: Messages, options: MessagePromptOptions) => string,
	onSubmit: (result: MessageReplyModalResult) => void,
	onClose: () => void
) => {
	event.preventDefault();

	const mode = getSelectedMode(inputs);
	const yourName = selects.yourNameSelect.value;
	const recipientName = selects.recipientSelect.value || context.senderName || "";

	if (mode === "preset") {
		const text = controls.presetPreview.value.trim();
		onSubmit({ mode, text });
		onClose();
		return;
	}

	const options = buildPromptOptions(yourName, recipientName, controls.promptInstructions.value);
	const text = buildPrompt(data, options);
	onSubmit({ mode, text });
	onClose();
};

/**
 * Creates a modal for replying to LinkedIn message threads.
 */
export const createMessageReplyModal = (args: MessageReplyModalArgs): void => {
	const { data, buildPrompt, onSubmit } = args;

	const state = buildModalState(data);
	const backdrop = createModalBackdrop(() => backdrop.remove());
	const modal = createModalContainer();

	const title = document.createElement("div");
	title.className = UI.CLASSES.MODAL_TITLE;
	title.textContent = "Reply to LinkedIn message";

	const selects = createReplySelects(state.participants, state.defaultYourName, state.defaultRecipientName, state.senderName);
	const modes = createModeControls();
	const presets = createPresetControls();
	const promptInstructions = createPromptControls();

	updatePresetPreview(presets.select, selects.recipientSelect.value, presets.preview);
	wirePresetUpdates(state.participants, selects.yourNameSelect, selects.recipientSelect, presets.select, presets.preview);

	const form = document.createElement("form");
	form.className = UI.CLASSES.MODAL_FORM;

	form.appendChild(
		createTwoColumnSection(
			{
				label: "You are",
				field: selects.yourNameSelect,
				hint: "Select your name from the thread",
			},
			{
				label: "Address",
				field: selects.recipientSelect,
				hint: "Who is the reply for?",
			}
		)
	);
	const replyTypeSection = createReplyTypeSection("Reply type", modes.container);
	const presetSection = createSection("Preset", presets.select);
	const presetPreviewSection = createSection("Preset preview", presets.preview, "Edit if you want to tweak the message");
	const promptSection = createSection("Prompt instructions", promptInstructions, "Only used when generating a prompt");

	const setModeVisibility = () => {
		const mode = getSelectedMode(modes.inputs);
		const isPreset = mode === "preset";
		presetSection.style.display = isPreset ? "" : "none";
		presetPreviewSection.style.display = isPreset ? "" : "none";
		promptSection.style.display = isPreset ? "none" : "";
		presetSection.setAttribute("aria-hidden", String(!isPreset));
		presetPreviewSection.setAttribute("aria-hidden", String(!isPreset));
		promptSection.setAttribute("aria-hidden", String(isPreset));
	};

	for (const input of modes.inputs) {
		input.addEventListener("change", setModeVisibility);
	}
	setModeVisibility();

	form.appendChild(replyTypeSection);
	form.appendChild(presetSection);
	form.appendChild(presetPreviewSection);
	form.appendChild(promptSection);
	form.appendChild(createModalButtons(() => backdrop.remove()));

	form.addEventListener("submit", (event) =>
		handleSubmit(
			event,
			data,
			modes.inputs,
			selects,
			{ presetPreview: presets.preview, promptInstructions },
			{ senderName: state.senderName },
			buildPrompt,
			onSubmit,
			() => backdrop.remove()
		)
	);

	modal.appendChild(title);
	modal.appendChild(form);
	backdrop.appendChild(modal);
	document.body.appendChild(backdrop);
};

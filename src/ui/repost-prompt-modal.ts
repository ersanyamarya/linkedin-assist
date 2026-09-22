import type { Emotion, RepostPromptOptions } from "../lib";
import { ALLOWED_EMOTIONS, RepostPromptOptionsSchema } from "../lib";
import { field, modalButtons, modalFooter, modalForm, numberInput, select, showModal, textArea } from "./components";

type RepostPromptModalArgs = {
	readonly postText: string;
	readonly onSubmit: (options: RepostPromptOptions) => void;
};

const parseOptionalNumber = (value: string): number | undefined => {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Creates a modal that captures inputs for the LinkedIn repost-with-thoughts prompt.
 */
export const createRepostPromptModal = (args: RepostPromptModalArgs): void => {
	const { postText, onSubmit } = args;

	let closeModal: () => void = () => {};

	const postTextArea = textArea(postText, true);
	const thoughtsArea = textArea("");
	const extraInstructionsArea = textArea("If possible, do a quick internet check on the topic so the caption stays accurate and factual.");
	const emotionSelect = select(ALLOWED_EMOTIONS);
	const maxLengthInput = numberInput("Optional word limit");

	const form = modalForm(
		[
			field("Post", postTextArea, "Read-only extracted text"),
			field("My perspective", thoughtsArea, "Very important — this shapes the generated caption"),
			field("Tone", emotionSelect, "Pick the emotional tone"),
			field("Max length", maxLengthInput, "Leave empty for no limit"),
			field("Extra instructions", extraInstructionsArea, "Optional guidance"),
		],
		(event) => {
			event.preventDefault();

			const options: RepostPromptOptions = {
				postText,
				yourThoughts: thoughtsArea.value.trim(),
				emotion: emotionSelect.value as Emotion,
				maxLengthWords: parseOptionalNumber(maxLengthInput.value),
				extraInstructions: extraInstructionsArea.value.trim() || undefined,
			};

			const parsed = RepostPromptOptionsSchema.safeParse(options);
			if (!parsed.success) {
				console.warn("LinkedIn Assist repost prompt input validation failed:", parsed.error.issues);
				alert("Please review the inputs before generating the prompt.");
				return;
			}

			onSubmit(parsed.data);
			closeModal();
		}
	);

	const footer = modalFooter([modalButtons("Cancel", "Generate prompt", () => closeModal(), form.id)]);
	const { close } = showModal("Repost with your thoughts", [form], footer);
	closeModal = close;
};

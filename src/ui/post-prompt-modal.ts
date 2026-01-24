import type { CommentPromptOptions, Emotion } from "../lib";
import { ALLOWED_EMOTIONS, CommentPromptOptionsSchema } from "../lib";
import { checkboxList, field, modalButtons, modalFooter, modalForm, numberInput, select, showModal, textArea } from "./components";

type CommentPromptModalArgs = {
	readonly postText: string;
	readonly comments: readonly string[];
	readonly onSubmit: (options: CommentPromptOptions) => void;
};

const parseOptionalNumber = (value: string): number | undefined => {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Creates a modal that captures inputs for the LinkedIn comment prompt.
 */
export const createPostCommentPromptModal = (args: CommentPromptModalArgs): void => {
	const { postText, comments, onSubmit } = args;

	let closeModal: () => void = () => {};

	const postTextArea = textArea(postText, true);
	const thoughtsArea = textArea("");
	const extraInstructionsArea = textArea("If possible, do a quick internet check on the topic so the comment stays accurate and factual.");
	const emotionSelect = select(ALLOWED_EMOTIONS);
	const maxLengthInput = numberInput("Optional word limit");
	const commentsList = checkboxList("Reference comments", comments, "Select comments to incorporate");

	const form = modalForm(
		[
			field("Post", postTextArea, "Read-only extracted text"),
			commentsList.el,
			field("Your perspective", thoughtsArea, "Add your viewpoint or context"),
			field("Tone", emotionSelect, "Pick the emotional tone"),
			field("Max length", maxLengthInput, "Leave empty for no limit"),
			field("Extra instructions", extraInstructionsArea, "Optional guidance"),
		],
		(event) => {
			event.preventDefault();

			const options: CommentPromptOptions = {
				postText,
				selectedComments: commentsList.getSelected(),
				yourThoughts: thoughtsArea.value.trim(),
				emotion: emotionSelect.value as Emotion,
				maxLengthWords: parseOptionalNumber(maxLengthInput.value),
				extraInstructions: extraInstructionsArea.value.trim() || undefined,
			};

			const parsed = CommentPromptOptionsSchema.safeParse(options);
			if (!parsed.success) {
				console.warn("LinkedIn Assist prompt input validation failed:", parsed.error.issues);
				alert("Please review the inputs before generating the prompt.");
				return;
			}

			onSubmit(parsed.data);
			closeModal();
		}
	);

	const footer = modalFooter([modalButtons("Cancel", "Generate prompt", () => closeModal(), form.id)]);
	const { close } = showModal("Draft a LinkedIn comment", [form], footer);
	closeModal = close;
};

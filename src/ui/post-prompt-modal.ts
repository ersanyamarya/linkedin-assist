import type { CommentPromptOptions } from "../lib";
import { CommentPromptOptionsSchema } from "../lib";
import { checkboxList, modalForm, showModal } from "./components";
import { composeFooter, instructionsFields, lengthGroup, postPreview, toneGroup, yourTakeField } from "./compose-fields";

type CommentPromptModalArgs = {
	readonly postText: string;
	readonly comments: readonly string[];
	readonly onSubmit: (options: CommentPromptOptions) => void;
};

/**
 * Creates a modal that captures inputs for the LinkedIn comment prompt.
 */
export const createPostCommentPromptModal = (args: CommentPromptModalArgs): void => {
	const { postText, comments, onSubmit } = args;

	let closeModal: () => void = () => {};

	const yourTake = yourTakeField("This shapes the comment most", "What do you think? Agree, push back, add an example from your own work…");
	const tone = toneGroup();
	const length = lengthGroup("Word limit for the comment");
	const commentsList = checkboxList("Comments to reference", comments);
	const instructions = instructionsFields("comment", "e.g. mention our pilot results, avoid hashtags");

	const form = modalForm([postPreview(postText), yourTake.el, tone.el, length.el, commentsList.el, instructions.factCheckEl, instructions.extraEl], (event) => {
		event.preventDefault();

		const options: CommentPromptOptions = {
			postText,
			selectedComments: commentsList.getSelected(),
			yourThoughts: yourTake.input.value.trim(),
			emotion: tone.getValue(),
			maxLengthWords: length.getWords(),
			extraInstructions: instructions.getInstructions(),
		};

		const parsed = CommentPromptOptionsSchema.safeParse(options);
		if (!parsed.success) {
			console.warn("LinkedIn Assist prompt input validation failed:", parsed.error.issues);
			alert("Please review the inputs before generating the prompt.");
			return;
		}

		onSubmit(parsed.data);
		closeModal();
	});
	form.classList.add("la-compose");

	const footer = composeFooter("Opens the prompt, ready to copy.", "Generate prompt", () => closeModal(), form.id);
	const { close } = showModal("Comment on this post", [form], footer);
	closeModal = close;
	yourTake.input.focus();
};

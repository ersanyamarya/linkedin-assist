import type { CommentPromptOptions } from "../lib";
import { CommentPromptOptionsSchema } from "../lib";
import { checkboxList, modalForm, showModal } from "./components";
import { composeFooter, instructionsFields, lengthGroup, postPreview, submitIfValid, toneGroup, yourTakeField } from "./compose-fields";

type CommentPromptModalArgs = {
	readonly postText: string;
	/** The comment being answered, when the editor is a reply box. Switches the form to reply wording. */
	readonly replyTo?: string;
	readonly comments: readonly string[];
	/** `reopen` brings this form back, as the user left it. */
	readonly onSubmit: (options: CommentPromptOptions, reopen: () => void) => void;
};

/**
 * Creates a modal that captures inputs for the LinkedIn comment prompt.
 */
export const createPostCommentPromptModal = (args: CommentPromptModalArgs): void => {
	const { postText, replyTo, comments, onSubmit } = args;
	const subject = replyTo ? "reply" : "comment";

	let modal: { close: () => void; hide: () => void; show: () => void } | undefined;

	const yourTake = yourTakeField(
		`This shapes the ${subject} most`,
		replyTo ? "What do you want to say back? Answer them, add detail, push back…" : "What do you think? Agree, push back, add an example from your own work…"
	);
	const tone = toneGroup();
	const length = lengthGroup(`Word limit for the ${subject}`);
	const commentsList = checkboxList(
		"Comments to reference",
		comments.filter((comment) => comment !== replyTo)
	);
	const instructions = instructionsFields(subject, "e.g. mention our pilot results, avoid hashtags");

	const form = modalForm(
		[
			postPreview(postText),
			...(replyTo ? [postPreview(replyTo, "The comment you're replying to")] : []),
			yourTake.el,
			tone.el,
			length.el,
			commentsList.el,
			instructions.factCheckEl,
			instructions.extraEl,
		],
		(event) => {
			event.preventDefault();

			const options: CommentPromptOptions = {
				postText,
				replyTo,
				selectedComments: commentsList.getSelected(),
				yourThoughts: yourTake.input.value.trim(),
				emotion: tone.getValue(),
				maxLengthWords: length.getWords(),
				factCheck: instructions.isFactCheckOn(),
				extraInstructions: instructions.getExtraInstructions(),
			};

			if (!modal) return;
			const { hide, show } = modal;
			if (submitIfValid(CommentPromptOptionsSchema, options, (data) => onSubmit(data, show))) hide();
		}
	);
	form.classList.add("la-compose");

	const footer = composeFooter("Opens the prompt, ready to copy.", "Generate prompt", () => modal?.close(), form.id);
	modal = showModal(replyTo ? "Reply to this comment" : "Comment on this post", [form], footer);
	yourTake.input.focus();
};

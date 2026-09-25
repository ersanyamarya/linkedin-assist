import type { RepostPromptOptions } from "../lib";
import { RepostPromptOptionsSchema } from "../lib";
import { modalForm, showModal } from "./components";
import { composeFooter, instructionsFields, lengthGroup, postPreview, submitIfValid, toneGroup, yourTakeField } from "./compose-fields";

type RepostPromptModalArgs = {
	readonly postText: string;
	/** `reopen` brings this form back, as the user left it. */
	readonly onSubmit: (options: RepostPromptOptions, reopen: () => void) => void;
};

/**
 * Creates a modal that captures inputs for the LinkedIn repost-with-thoughts prompt.
 */
export const createRepostPromptModal = (args: RepostPromptModalArgs): void => {
	const { postText, onSubmit } = args;

	let modal: { close: () => void; hide: () => void; show: () => void } | undefined;

	const yourTake = yourTakeField("This shapes the caption most", "Why are you sharing this? What should your network take from it?");
	const tone = toneGroup();
	const length = lengthGroup("Word limit for the caption");
	const instructions = instructionsFields("caption", "e.g. tag the author's point about pricing, keep it to one paragraph");

	const form = modalForm(
		[postPreview(postText, "The post you're reposting"), yourTake.el, tone.el, length.el, instructions.factCheckEl, instructions.extraEl],
		(event) => {
			event.preventDefault();

			const options: RepostPromptOptions = {
				postText,
				yourThoughts: yourTake.input.value.trim(),
				emotion: tone.getValue(),
				maxLengthWords: length.getWords(),
				factCheck: instructions.isFactCheckOn(),
				extraInstructions: instructions.getExtraInstructions(),
			};

			if (!modal) return;
			const { hide, show } = modal;
			if (submitIfValid(RepostPromptOptionsSchema, options, (data) => onSubmit(data, show))) hide();
		}
	);
	form.classList.add("la-compose");

	const footer = composeFooter("Opens the prompt, ready to copy.", "Generate prompt", () => modal?.close(), form.id);
	modal = showModal("Repost with your thoughts", [form], footer);
	yourTake.input.focus();
};

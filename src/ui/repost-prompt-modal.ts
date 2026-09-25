import type { RepostPromptOptions } from "../lib";
import { RepostPromptOptionsSchema } from "../lib";
import { modalForm, showModal } from "./components";
import { composeFooter, instructionsFields, lengthGroup, postPreview, toneGroup, yourTakeField } from "./compose-fields";
import { showNotice } from "./notice";

type RepostPromptModalArgs = {
	readonly postText: string;
	readonly onSubmit: (options: RepostPromptOptions) => void;
};

/**
 * Creates a modal that captures inputs for the LinkedIn repost-with-thoughts prompt.
 */
export const createRepostPromptModal = (args: RepostPromptModalArgs): void => {
	const { postText, onSubmit } = args;

	let closeModal: () => void = () => {};

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
				extraInstructions: instructions.getInstructions(),
			};

			const parsed = RepostPromptOptionsSchema.safeParse(options);
			if (!parsed.success) {
				console.warn("LinkedIn Assist repost prompt input validation failed:", parsed.error.issues);
				showNotice("Some inputs need a look", "Check your take and the options, then generate the prompt again.");
				return;
			}

			onSubmit(parsed.data);
			closeModal();
		}
	);
	form.classList.add("la-compose");

	const footer = composeFooter("Opens the prompt, ready to copy.", "Generate prompt", () => closeModal(), form.id);
	const { close } = showModal("Repost with your thoughts", [form], footer);
	closeModal = close;
	yourTake.input.focus();
};

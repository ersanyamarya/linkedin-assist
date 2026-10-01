import type { ConnectionNotePromptOptions, Profile } from "../lib";
import { CONNECTION_NOTE_LIMITS, ConnectionNotePromptOptionsSchema } from "../lib";
import { el, modalForm, pillGroup, showModal, textArea } from "./components";
import { composeFooter, postPreview, submitIfValid, toneGroup, yourTakeField } from "./compose-fields";

type ConnectionNoteModalArgs = {
	readonly profile: Profile;
	/** `reopen` brings this form back, as the user left it. */
	readonly onSubmit: (options: ConnectionNotePromptOptions, reopen: () => void) => void;
};

const LIMIT_LABELS: Record<(typeof CONNECTION_NOTE_LIMITS)[number], string> = { 200: "200 · free", 300: "300 · Premium" };
const DEFAULT_LIMIT = "200";

const profileSummary = ({ name, headline, location }: Profile): string => [name, headline, location].filter(Boolean).join("\n");

/**
 * Creates a modal that captures inputs for a connection-request note. The note has a hard
 * character limit, so the form asks which one applies to the sender's account.
 */
export const createConnectionNoteModal = (args: ConnectionNoteModalArgs): void => {
	const { profile, onSubmit } = args;

	let modal: { close: () => void; hide: () => void; show: () => void } | undefined;

	const yourTake = yourTakeField("This shapes the note most", "Why do you want to connect? A shared interest, something they posted, a mutual contact…");
	const tone = toneGroup();
	const limit = pillGroup(
		"Length",
		CONNECTION_NOTE_LIMITS.map((chars) => ({ value: String(chars), label: LIMIT_LABELS[chars] })),
		DEFAULT_LIMIT,
		"LinkedIn's character limit for your account"
	);
	const extra = textArea("", false, "e.g. mention we both spoke at the same meetup");
	extra.rows = 2;
	const extraField = el("div", { className: "la-field" }, [el("label", { className: "la-label" }, ["Extra instructions (optional)"]), extra]);

	const form = modalForm([postPreview(profileSummary(profile), "Connecting with"), yourTake.el, tone.el, limit.el, extraField], (event) => {
		event.preventDefault();

		const options: ConnectionNotePromptOptions = {
			profile,
			yourThoughts: yourTake.input.value.trim(),
			emotion: tone.getValue(),
			maxChars: Number.parseInt(limit.getValue(), 10),
			extraInstructions: extra.value.trim() || undefined,
		};

		if (!modal) return;
		const { hide, show } = modal;
		if (submitIfValid(ConnectionNotePromptOptionsSchema, options, (data) => onSubmit(data, show))) hide();
	});
	form.classList.add("la-compose");

	const footer = composeFooter("Opens the prompt, ready to copy.", "Generate prompt", () => modal?.close(), form.id);
	modal = showModal(`Connect with ${profile.name || "this person"}`, [form], footer);
	yourTake.input.focus();
};

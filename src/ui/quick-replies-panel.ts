/**
 * Quick-replies popover: preset reply pills with a preview, opened from the idea button in a
 * messaging composer. Works in both the Messaging page and the small chat pop-ups.
 *
 * The panel is portaled to <body> with fixed positioning, because LinkedIn's chat pop-ups clip
 * overflowing children; it is sized to the composer it belongs to and flips below the button
 * when there is no room above.
 */
import { el } from "./components";
import { applyMessageTemplate, MESSAGE_REPLY_PRESETS, type MessageReplyPreset } from "./message-reply-modal";

const PREFIX = "la-quick-replies";
const MAX_WIDTH = 440;
const MIN_WIDTH = 260;
// Below this width the preview is dropped so the panel stays short inside chat pop-ups.
const COMPACT_WIDTH = 360;
const GAP = 8;
const WHITESPACE = /\s+/g;

type QuickRepliesPanelArgs = {
	readonly button: HTMLButtonElement;
	readonly editor: HTMLElement;
	readonly getRecipientName: () => string;
	readonly onInsert: (text: string) => void;
	readonly onMoreOptions: () => void;
};

export type QuickRepliesPanel = {
	readonly toggle: () => void;
	readonly close: () => void;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const createQuickRepliesPanel = (args: QuickRepliesPanelArgs): QuickRepliesPanel => {
	const { button, editor, getRecipientName, onInsert, onMoreOptions } = args;

	let recipientName = "";
	let isOpen = false;

	const recipientLabel = el("span", { className: `${PREFIX}__recipient` });
	const previewText = el("div", { className: `${PREFIX}__preview-text` });

	const pills = MESSAGE_REPLY_PRESETS.map((preset) => {
		const pill = el("button", { type: "button", className: `${PREFIX}__pill` }, [preset.label]);
		pill.addEventListener("mouseenter", () => peek(preset));
		pill.addEventListener("focus", () => peek(preset));
		pill.addEventListener("click", () => {
			onInsert(applyMessageTemplate(preset.template, recipientName));
			close();
		});
		return { preset, pill };
	});

	const moreOptions = el("button", { type: "button", className: `${PREFIX}__more` }, [
		el("span", { className: `${PREFIX}__more-title` }, ["More options"]),
		el("span", { className: `${PREFIX}__more-hint` }, ["Edit a preset, or generate a prompt with tone and length"]),
	]);
	moreOptions.addEventListener("click", () => {
		close();
		onMoreOptions();
	});

	const panel = el("div", { className: PREFIX, role: "dialog" }, [
		el("div", { className: `${PREFIX}__header` }, [el("span", { className: `${PREFIX}__title` }, ["Quick replies"]), recipientLabel]),
		el(
			"div",
			{ className: `${PREFIX}__pills` },
			pills.map((p) => p.pill)
		),
		el("div", { className: `${PREFIX}__preview` }, [el("div", { className: `${PREFIX}__preview-label` }, ["Preview · click to insert"]), previewText]),
		moreOptions,
	]);
	panel.setAttribute("aria-label", "Quick replies");

	function peek(preset: MessageReplyPreset) {
		// One flowing line: the template's blank lines would waste the clamped preview's space.
		previewText.textContent = applyMessageTemplate(preset.template, recipientName).replace(WHITESPACE, " ");
		for (const p of pills) p.pill.classList.toggle("is-active", p.preset.id === preset.id);
	}

	/** Sizes the panel to its composer and places it above the button, or below when it doesn't fit. */
	const position = () => {
		const composer = editor.closest("form") ?? editor.parentElement ?? editor;
		const composerRect = composer.getBoundingClientRect();
		const buttonRect = button.getBoundingClientRect();

		const width = clamp(composerRect.width - GAP * 2, MIN_WIDTH, MAX_WIDTH);
		panel.style.width = `${width}px`;
		panel.classList.toggle(`${PREFIX}--compact`, width < COMPACT_WIDTH);

		const left = clamp(composerRect.left + GAP, GAP, window.innerWidth - width - GAP);
		const above = buttonRect.top - panel.offsetHeight - GAP;
		const top = above >= GAP ? above : Math.min(buttonRect.bottom + GAP, window.innerHeight - panel.offsetHeight - GAP);
		panel.style.left = `${left}px`;
		panel.style.top = `${Math.max(top, GAP)}px`;
	};

	const onPointerDown = (event: PointerEvent) => {
		const target = event.target as Node;
		if (!(panel.contains(target) || button.contains(target))) close();
	};
	const onKeydown = (event: KeyboardEvent) => {
		if (event.key !== "Escape") return;
		close();
		button.focus();
	};

	function open() {
		recipientName = getRecipientName();
		recipientLabel.textContent = recipientName ? `to ${recipientName}` : "";
		const first = MESSAGE_REPLY_PRESETS[0];
		if (first) peek(first);

		document.body.append(panel);
		position();
		isOpen = true;
		button.setAttribute("aria-expanded", "true");
		button.classList.add("linkedin-assist__idea-button--active");

		document.addEventListener("pointerdown", onPointerDown, true);
		document.addEventListener("keydown", onKeydown);
		window.addEventListener("resize", position);
		window.addEventListener("scroll", position, true);
		editor.addEventListener("input", close, { once: true });
	}

	function close() {
		if (!isOpen) return;
		isOpen = false;
		panel.remove();
		button.setAttribute("aria-expanded", "false");
		button.classList.remove("linkedin-assist__idea-button--active");

		document.removeEventListener("pointerdown", onPointerDown, true);
		document.removeEventListener("keydown", onKeydown);
		window.removeEventListener("resize", position);
		window.removeEventListener("scroll", position, true);
		editor.removeEventListener("input", close);
	}

	button.setAttribute("aria-haspopup", "dialog");
	button.setAttribute("aria-expanded", "false");

	return { toggle: () => (isOpen ? close() : open()), close };
};

const escapeHtml = (value: string): string =>
	value.replace(
		/[&<>"']/g,
		(char) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			})[char] ?? char
	);

export const setEditableText = (editableTextArea: Element, text: string) => {
	const target = editableTextArea as HTMLElement;
	target.focus();
	target.textContent = "";
	target.removeAttribute("data-placeholder");
	target.removeAttribute("data-placeholder-rtl");
	target.dispatchEvent(new InputEvent("input", { bubbles: true }));

	const normalized = text.replace(/\r\n/g, "\n");
	const selection = window.getSelection();
	if (selection) {
		const range = document.createRange();
		range.selectNodeContents(target);
		selection.removeAllRanges();
		selection.addRange(range);
	}

	const beforeInput = new InputEvent("beforeinput", {
		bubbles: true,
		cancelable: true,
		inputType: "insertText",
		data: normalized,
	});
	target.dispatchEvent(beforeInput);

	const usedExecCommand = document.execCommand?.("insertText", false, normalized) ?? false;
	if (!usedExecCommand) {
		const html = normalized
			.split("\n")
			.map((line) => escapeHtml(line))
			.join("<br>");
		target.innerHTML = html;
	}

	target.dispatchEvent(
		new InputEvent("input", {
			bubbles: true,
			inputType: "insertText",
			data: normalized,
		})
	);
	target.focus();
};

const ENTER_TO_SEND_ATTR = "data-enter-to-send-bound";

export const ensureEnterToSend = (editableTextArea: HTMLElement) => {
	if (editableTextArea.hasAttribute(ENTER_TO_SEND_ATTR)) return;
	editableTextArea.setAttribute(ENTER_TO_SEND_ATTR, "true");

	editableTextArea.addEventListener("keydown", (event: KeyboardEvent) => {
		if (event.defaultPrevented) return;
		if (event.key !== "Enter" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
		if (event.isComposing) return;

		const target = event.currentTarget as HTMLElement;
		if (!target.textContent?.trim()) return;

		const form = target.closest("form");
		if (!form) return;

		const sendButton =
			form.querySelector<HTMLButtonElement>(
				"button[type='submit'], button.msg-form__send-button, button[data-control-name='send'], button[aria-label^='Send']"
			) ?? null;
		if (!sendButton) return;
		if (sendButton.hasAttribute("disabled") || sendButton.getAttribute("aria-disabled") === "true") return;

		event.preventDefault();
		sendButton.click();
	});
};

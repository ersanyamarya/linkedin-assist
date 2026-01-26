/**
 * Simple text display modal with copy-to-clipboard functionality.
 */
import { btn, el, modalFooter, showModal } from "./components";

export const createTextModal = (text: string): void => {
	const normalizedText = text.replace(/\n{3,}/g, "\n\n");
	const content = el(
		"textarea",
		{
			className: "la-modal__content la-textarea",
			readOnly: true,
			value: normalizedText,
			style: "min-height:420px;font-size:14px;line-height:1.5;color:#333",
		},
		[]
	);

	const copyBtn = btn("Copy", "primary");
	const closeBtn = btn("Close", "secondary");

	const footer = modalFooter([el("div", { className: "la-modal__actions" }, [closeBtn, copyBtn])]);

	const { close } = showModal("Generated Prompt", [content], footer);

	copyBtn.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(normalizedText);
			copyBtn.textContent = "Copied!";
			setTimeout(close, 500);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	});

	closeBtn.addEventListener("click", close);
};

/**
 * Simple text display modal with copy-to-clipboard functionality.
 */
import { btn, el, modalForm, showModal } from "./components";

export const createTextModal = (text: string): void => {
	const content = el("div", { className: "la-modal__content", style: "white-space:pre-wrap;font-size:14px;line-height:1.5;color:#333" }, [text]);

	const copyBtn = btn("Copy", "primary");
	const closeBtn = btn("Close", "secondary");

	const form = modalForm([content, el("div", { className: "la-modal__actions" }, [copyBtn, closeBtn])], (e) => e.preventDefault());

	const { close } = showModal("", form);

	copyBtn.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(text);
			copyBtn.textContent = "Copied!";
			setTimeout(close, 500);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	});

	closeBtn.addEventListener("click", close);
};

/**
 * Small dismissible notice at the bottom of the page, used instead of blocking browser alerts.
 * One notice shows at a time; a new one replaces the old. It fades out on its own after a few
 * seconds, and stays while the pointer is over it.
 */
import { UI } from "../lib";
import { el } from "./components";

const AUTO_DISMISS_MS = 6000;

const WARNING_ICON =
	'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>';

let current: { remove: () => void } | undefined;

export const showNotice = (title: string, message: string): void => {
	current?.remove();

	const icon = el("span", { className: "la-notice__icon", innerHTML: WARNING_ICON });
	const dismiss = el("button", { type: "button", className: "la-notice__dismiss", innerHTML: UI.SVG.CLOSE });
	dismiss.setAttribute("aria-label", "Dismiss");

	const notice = el("div", { className: "la-notice", role: "alert" }, [
		icon,
		el("div", { className: "la-notice__text" }, [
			el("div", { className: "la-notice__title" }, [title]),
			el("div", { className: "la-notice__message" }, [message]),
		]),
		dismiss,
	]);

	let timer: ReturnType<typeof setTimeout> | undefined;
	const remove = () => {
		clearTimeout(timer);
		notice.remove();
		if (current?.remove === remove) current = undefined;
	};
	const startTimer = () => {
		clearTimeout(timer);
		timer = setTimeout(remove, AUTO_DISMISS_MS);
	};

	dismiss.addEventListener("click", remove);
	notice.addEventListener("mouseenter", () => clearTimeout(timer));
	notice.addEventListener("mouseleave", startTimer);

	document.body.append(notice);
	startTimer();
	current = { remove };
};

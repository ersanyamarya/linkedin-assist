import { UI } from "../lib";

/** The light-bulb button injected next to LinkedIn editors, posts and profiles. Pass `icon` (SVG markup) for a different glyph. */
export const createIdeaButton = (onClick: (button: HTMLButtonElement) => void, label = "Generate a reply idea", icon = UI.SVG.IDEA): HTMLButtonElement => {
	const button = document.createElement("button");
	button.classList.add(UI.CLASSES.IDEA_BUTTON);
	button.type = "button";
	button.title = label;
	button.setAttribute("aria-label", label);
	button.innerHTML = icon;
	button.addEventListener("click", () => onClick(button));
	return button;
};

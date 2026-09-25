import { UI } from "../lib";

/** The light-bulb button injected next to LinkedIn editors, posts and profiles. */
export const createIdeaButton = (onClick: (button: HTMLButtonElement) => void, label = "Generate a reply idea"): HTMLButtonElement => {
	const button = document.createElement("button");
	button.classList.add(UI.CLASSES.IDEA_BUTTON);
	button.type = "button";
	button.title = label;
	button.setAttribute("aria-label", label);
	button.innerHTML = UI.SVG.IDEA;
	button.addEventListener("click", () => onClick(button));
	return button;
};

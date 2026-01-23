import { loadedCommentScript } from "./comment";

const observer = new MutationObserver(() => {
	loadedCommentScript();
});

observer.observe(document.body, { childList: true, subtree: true });

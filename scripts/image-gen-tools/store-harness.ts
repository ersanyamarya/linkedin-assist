/**
 * Browser entry for the store screenshots. It mounts the extension's real modals with a stubbed
 * `chrome.runtime`, so the screenshots show the shipped UI rather than a redrawn copy.
 */
import { buildConnectionNotePrompt, buildLinkedInCommentPrompt } from "../../src/prompt";
import { createConnectionNoteModal, createPostCommentPromptModal, createTextModal } from "../../src/ui";

type Scene = {
	post: string;
	comments: string[];
	profile: { name: string; headline: string; location: string };
	reply: string;
};

const COMMENT_MAX_CHARS = 1250;
const AFTER_WHITESPACE = /(?<=\s)/;

let reply = "";

const AI_STATUS = { configured: true, activeId: "p1", providerName: "OpenAI", model: "gpt-4o-mini", host: "api.openai.com", providers: [] };

const stubChrome = () => {
	const port = () => {
		const listeners: ((event: unknown) => void)[] = [];
		return {
			onMessage: { addListener: (fn: (event: unknown) => void) => listeners.push(fn) },
			onDisconnect: { addListener: () => undefined },
			postMessage: () => {
				const words = reply.split(AFTER_WHITESPACE);
				for (const [i, text] of words.entries()) setTimeout(() => emit(listeners, { type: "delta", text }), i);
				setTimeout(() => emit(listeners, { type: "done" }), words.length + 1);
			},
			disconnect: () => undefined,
		};
	};
	const emit = (listeners: ((event: unknown) => void)[], event: unknown) => {
		for (const fn of listeners) fn(event);
	};
	Object.assign(globalThis, {
		chrome: {
			runtime: {
				sendMessage: async (message: { type: string }) => (message.type === "ai-status" ? AI_STATUS : undefined),
				connect: port,
			},
		},
	});
};

const openComment = (scene: Scene) => {
	reply = scene.reply;
	createPostCommentPromptModal({
		postText: scene.post,
		comments: scene.comments,
		onSubmit: (options, reopen) =>
			createTextModal(buildLinkedInCommentPrompt({ ...options, voiceSamples: [] }), "Your comment prompt is ready", undefined, {
				onBack: reopen,
				onInsert: () => undefined,
				maxChars: COMMENT_MAX_CHARS,
			}),
	});
};

const openConnect = (scene: Scene) => {
	reply = scene.reply;
	const { name, headline, location } = scene.profile;
	createConnectionNoteModal({
		profile: { name, headline, location, about: "", experience: "", education: "", skills: "" } as never,
		onSubmit: (options, reopen) =>
			createTextModal(buildConnectionNotePrompt({ ...options, voiceSamples: [] }), "Your connection note prompt is ready", undefined, {
				onBack: reopen,
				maxChars: options.maxChars,
			}),
	});
};

stubChrome();
Object.assign(globalThis, { storeScenes: { openComment, openConnect } });

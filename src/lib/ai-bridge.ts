/**
 * Messages between content scripts and the background worker for AI generation.
 * Content scripts can't call the API themselves: their requests run under linkedin.com's origin
 * (CORS), and they shouldn't see the token. The worker does the call and streams text back.
 */

export const AI_GENERATE_PORT = "la-generate";

export type AiStatus = { configured: boolean; model?: string; host?: string };
export type AiRuntimeMessage = { type: "ai-status" } | { type: "open-options" };
export type GenerateRequest = { prompt: string };
export type GenerateEvent = { type: "delta"; text: string } | { type: "done" } | { type: "error"; message: string };

const NOT_CONFIGURED: AiStatus = { configured: false };

/** Whether generation is set up. Resolves to "not configured" if the worker can't be reached. */
export const getAiStatus = async (): Promise<AiStatus> => {
	try {
		return ((await chrome.runtime.sendMessage({ type: "ai-status" } satisfies AiRuntimeMessage)) as AiStatus | undefined) ?? NOT_CONFIGURED;
	} catch {
		return NOT_CONFIGURED;
	}
};

export const openAiSettings = (): void => {
	chrome.runtime.sendMessage({ type: "open-options" } satisfies AiRuntimeMessage).catch(() => {});
};

type GenerateHandlers = { onDelta: (text: string) => void; onDone: () => void; onError: (message: string) => void };

/** Streams a reply to `prompt`. Returns a function that stops it; no handler fires after that. */
export const generateReply = (prompt: string, { onDelta, onDone, onError }: GenerateHandlers): (() => void) => {
	let port: chrome.runtime.Port | undefined;
	let finished = false;
	const finish = () => {
		finished = true;
		port?.disconnect();
	};

	try {
		port = chrome.runtime.connect(undefined, { name: AI_GENERATE_PORT });
	} catch {
		// The extension was reloaded or updated since this page loaded.
		queueMicrotask(() => onError("LinkedIn Assist was updated. Reload the page and try again."));
		return () => {};
	}

	port.onMessage.addListener((event: GenerateEvent) => {
		if (finished) return;
		if (event.type === "delta") onDelta(event.text);
		else if (event.type === "done") {
			finish();
			onDone();
		} else {
			finish();
			onError(event.message);
		}
	});
	port.onDisconnect.addListener(() => {
		if (finished) return;
		finished = true;
		onError("The connection to the extension closed. Try again.");
	});
	port.postMessage({ prompt } satisfies GenerateRequest);

	return finish;
};

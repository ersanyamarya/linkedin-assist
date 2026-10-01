/**
 * Background worker: answers AI status checks and runs generation for content scripts,
 * streaming the reply back over a port. Disconnecting the port aborts the request.
 */
import type { AiRuntimeMessage, AiStatus, GenerateEvent, GenerateRequest } from "../lib/ai-bridge";
import { AI_GENERATE_PORT } from "../lib/ai-bridge";
import { describeAiError, streamChat } from "../lib/ai-client";
import { activeProvider, isAiConfigured, loadAiSettings, loadProviders, originPattern, saveProviders } from "../lib/ai-settings";

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

const getStatus = async (): Promise<AiStatus> => {
	const state = await loadProviders();
	const active = activeProvider(state);
	if (!isAiConfigured(active)) return { configured: false };
	return {
		configured: true,
		activeId: active.id,
		providerName: active.name,
		model: active.model,
		host: new URL(active.baseUrl).host,
		providers: state.providers.filter((p) => isAiConfigured(p)).map(({ id, name, model }) => ({ id, name, model })),
	};
};

const setActive = async (id: string): Promise<AiStatus> => {
	const state = await loadProviders();
	if (state.providers.some((p) => p.id === id)) await saveProviders({ ...state, activeId: id });
	return getStatus();
};

chrome.runtime.onMessage.addListener((message: AiRuntimeMessage, _sender, sendResponse) => {
	if (message?.type === "ai-status") {
		getStatus().then(sendResponse, () => sendResponse({ configured: false } satisfies AiStatus));
		return true;
	}
	if (message?.type === "ai-set-active") {
		setActive(message.id).then(sendResponse, () => sendResponse(undefined));
		return true;
	}
	if (message?.type === "open-options") chrome.runtime.openOptionsPage();
	return false;
});

const generate = async (port: chrome.runtime.Port, prompt: string, signal: AbortSignal): Promise<void> => {
	const send = (event: GenerateEvent) => {
		if (!signal.aborted) port.postMessage(event);
	};

	const settings = await loadAiSettings();
	if (!isAiConfigured(settings)) {
		send({ type: "error", message: "AI generation isn't set up yet. Open the extension options to add a server." });
		return;
	}
	if (!(await chrome.permissions.contains({ origins: [originPattern(settings.baseUrl)] }))) {
		send({ type: "error", message: "The extension doesn't have access to your AI server. Open the options and save the settings again." });
		return;
	}

	try {
		for await (const text of streamChat(settings, prompt, signal)) send({ type: "delta", text });
		send({ type: "done" });
	} catch (err) {
		if (!signal.aborted) send({ type: "error", message: describeAiError(err) });
	}
};

chrome.runtime.onConnect.addListener((port) => {
	if (port.name !== AI_GENERATE_PORT) return;
	const controller = new AbortController();
	port.onDisconnect.addListener(() => controller.abort());
	port.onMessage.addListener((request: GenerateRequest) => {
		generate(port, request.prompt, controller.signal);
	});
});

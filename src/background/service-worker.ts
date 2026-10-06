/**
 * Background worker: answers AI status checks and runs generation for content scripts,
 * streaming the reply back over a port. Disconnecting the port aborts the request.
 */
import type { AiRuntimeMessage, AiStatus, GenerateEvent, GenerateRequest } from "../lib/ai-bridge";
import { AI_GENERATE_PORT } from "../lib/ai-bridge";
import { describeAiError, streamChat } from "../lib/ai-client";
import { activeProvider, isAiConfigured, loadAiSettings, loadProviders, originPattern, saveProviders } from "../lib/ai-settings";
import type { VoiceRuntimeMessage } from "../lib/voice-settings";
import { readVoiceSamples, writeVoiceSamples } from "./voice-store";

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

/** True for the extension's own pages (options), false for content scripts running on linkedin.com. */
const isExtensionPage = (sender: chrome.runtime.MessageSender): boolean =>
	sender.id === chrome.runtime.id && Boolean(sender.url?.startsWith(chrome.runtime.getURL("")));

type RuntimeMessage = AiRuntimeMessage | VoiceRuntimeMessage;
type MessageOf<T extends RuntimeMessage["type"]> = Extract<RuntimeMessage, { type: T }>;
type Respond = (response?: unknown) => void;
/** Returns true when it will answer later through `respond`, which keeps the message channel open. */
type Handler<T extends RuntimeMessage["type"]> = (message: MessageOf<T>, sender: chrome.runtime.MessageSender, respond: Respond) => boolean;

/** Answers with the result of `work`, or with `fallback` if it fails. */
const respondLater = (work: Promise<unknown>, respond: Respond, fallback: unknown): true => {
	work.then(respond, () => respond(fallback));
	return true;
};

const handlers: { [T in RuntimeMessage["type"]]: Handler<T> } = {
	"voice-load": (_message, _sender, respond) => respondLater(readVoiceSamples(), respond, []),
	"voice-save": (message, sender, respond) => {
		if (!isExtensionPage(sender)) {
			respond(false);
			return false;
		}
		return respondLater(
			writeVoiceSamples(message.samples).then(() => true),
			respond,
			false
		);
	},
	"ai-status": (_message, _sender, respond) => respondLater(getStatus(), respond, { configured: false } satisfies AiStatus),
	"ai-set-active": (message, _sender, respond) => respondLater(setActive(message.id), respond, undefined),
	"open-options": () => {
		chrome.runtime.openOptionsPage();
		return false;
	},
};

const findHandler = (type: unknown): Handler<RuntimeMessage["type"]> | undefined =>
	typeof type === "string" && Object.hasOwn(handlers, type) ? (handlers[type as RuntimeMessage["type"]] as Handler<RuntimeMessage["type"]>) : undefined;

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, respond) => findHandler(message?.type)?.(message, sender, respond) ?? false);

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

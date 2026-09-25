/**
 * Connection settings for the optional OpenAI-compatible API, kept in `chrome.storage.local`.
 * Only the background worker and the options page read these; content scripts ask the worker
 * for status instead, so the token never passes through LinkedIn pages.
 */

export type AiConnection = { baseUrl: string; apiKey: string };
export type AiSettings = AiConnection & { model: string };

const STORAGE_KEY = "aiSettings";
const TRAILING_SLASHES = /\/+$/;

export const loadAiSettings = async (): Promise<AiSettings | undefined> => {
	const stored = await chrome.storage.local.get(STORAGE_KEY);
	return stored[STORAGE_KEY] as AiSettings | undefined;
};

export const saveAiSettings = (settings: AiSettings): Promise<void> => chrome.storage.local.set({ [STORAGE_KEY]: settings });

export const clearAiSettings = (): Promise<void> => chrome.storage.local.remove(STORAGE_KEY);

export const isAiConfigured = (settings: AiSettings | undefined): settings is AiSettings => Boolean(settings?.baseUrl && settings.model);

/** Trims and drops trailing slashes; throws when it isn't an http(s) URL. */
export const normalizeBaseUrl = (value: string): string => {
	const trimmed = value.trim().replace(TRAILING_SLASHES, "");
	const url = new URL(trimmed);
	if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use an http:// or https:// URL.");
	return trimmed;
};

/** Host-permission match pattern covering the API's origin, e.g. `https://api.openai.com/*`. */
export const originPattern = (baseUrl: string): string => `${new URL(baseUrl).origin}/*`;

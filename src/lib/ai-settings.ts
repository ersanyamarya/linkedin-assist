/**
 * Connection settings for the optional OpenAI-compatible APIs, kept in `chrome.storage.local`.
 * Several providers can be saved; one is "in use". Only the background worker and the options
 * page read these; content scripts ask the worker for a token-free summary instead, so the
 * token never passes through LinkedIn pages.
 */
import { decryptApiKey, encryptApiKey } from "../crypto-key";

export type AiConnection = { baseUrl: string; apiKey: string };
export type AiSettings = AiConnection & { model: string };
export type AiProvider = AiSettings & {
	id: string;
	name: string;
	/** Models found the last time the list was loaded, so the picker isn't empty on reopen. */
	models: string[];
};
export type AiProviders = { providers: AiProvider[]; activeId?: string };

const STORAGE_KEY = "aiProviders";
const LEGACY_KEY = "aiSettings";
const LEGACY_PROVIDER_ID = "legacy";
const TRAILING_SLASHES = /\/+$/;

/** A readable default name for a provider: its host, e.g. `api.openai.com`. */
export const hostOf = (baseUrl: string): string => {
	try {
		return new URL(baseUrl).host;
	} catch {
		return baseUrl;
	}
};

const ENCRYPTED_PREFIX = "v1:";

/** Encrypts the token for storage; an empty token stays empty. */
const sealProvider = async (provider: AiProvider): Promise<AiProvider> => ({
	...provider,
	apiKey: provider.apiKey ? await encryptApiKey(provider.apiKey) : "",
});

/** Decrypts a stored token. Returns `migrated: true` for one saved as plain text by an older version. */
const openProvider = async (provider: AiProvider): Promise<{ provider: AiProvider; migrated: boolean }> => {
	if (!provider.apiKey) return { provider, migrated: false };
	if (!provider.apiKey.startsWith(ENCRYPTED_PREFIX)) return { provider, migrated: true };
	try {
		return { provider: { ...provider, apiKey: await decryptApiKey(provider.apiKey) }, migrated: false };
	} catch {
		// The encryption key is gone or the value was altered; the token must be entered again.
		return { provider: { ...provider, apiKey: "" }, migrated: false };
	}
};

export const loadProviders = async (): Promise<AiProviders> => {
	const stored = await chrome.storage.local.get([STORAGE_KEY, LEGACY_KEY]);
	const current = stored[STORAGE_KEY] as AiProviders | undefined;
	if (current) {
		const opened = await Promise.all(current.providers.map(openProvider));
		const state: AiProviders = { ...current, providers: opened.map((o) => o.provider) };
		// Tokens saved as plain text by an older version are re-saved encrypted.
		if (opened.some((o) => o.migrated)) await saveProviders(state);
		return state;
	}

	// Settings saved by the single-provider version become the first provider.
	const legacy = stored[LEGACY_KEY] as AiSettings | undefined;
	if (!legacy) return { providers: [] };
	const migrated: AiProviders = {
		providers: [{ ...legacy, id: LEGACY_PROVIDER_ID, name: hostOf(legacy.baseUrl), models: [] }],
		activeId: LEGACY_PROVIDER_ID,
	};
	await saveProviders(migrated);
	await chrome.storage.local.remove(LEGACY_KEY);
	return migrated;
};

/** Takes providers with plain tokens and stores them with the tokens encrypted. */
export const saveProviders = async (state: AiProviders): Promise<void> => {
	const providers = await Promise.all(state.providers.map(sealProvider));
	await chrome.storage.local.set({ [STORAGE_KEY]: { ...state, providers } });
};

/** The provider in use, or the first one when the saved choice no longer exists. */
export const activeProvider = ({ providers, activeId }: AiProviders): AiProvider | undefined => providers.find((p) => p.id === activeId) ?? providers[0];

export const loadAiSettings = async (): Promise<AiProvider | undefined> => activeProvider(await loadProviders());

export const isAiConfigured = <T extends AiSettings>(settings: T | undefined): settings is T => Boolean(settings?.baseUrl && settings.model);

/** Trims and drops trailing slashes; throws when it isn't an http(s) URL or embeds credentials. */
export const normalizeBaseUrl = (value: string): string => {
	const trimmed = value.trim().replace(TRAILING_SLASHES, "");
	const url = new URL(trimmed);
	if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use an http:// or https:// URL.");
	if (url.username || url.password) throw new Error("Remove the username and password from the URL; use the API key field instead.");
	return trimmed;
};

/** Host-permission match pattern covering the API's origin, e.g. `https://api.openai.com/*`. */
export const originPattern = (baseUrl: string): string => `${new URL(baseUrl).origin}/*`;

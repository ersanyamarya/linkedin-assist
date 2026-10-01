/**
 * Connection settings for the optional OpenAI-compatible APIs, kept in `chrome.storage.local`.
 * Several providers can be saved; one is "in use". Only the background worker and the options
 * page read these; content scripts ask the worker for a token-free summary instead, so the
 * token never passes through LinkedIn pages.
 */

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

export const loadProviders = async (): Promise<AiProviders> => {
	const stored = await chrome.storage.local.get([STORAGE_KEY, LEGACY_KEY]);
	const current = stored[STORAGE_KEY] as AiProviders | undefined;
	if (current) return current;

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

export const saveProviders = (state: AiProviders): Promise<void> => chrome.storage.local.set({ [STORAGE_KEY]: state });

/** The provider in use, or the first one when the saved choice no longer exists. */
export const activeProvider = ({ providers, activeId }: AiProviders): AiProvider | undefined => providers.find((p) => p.id === activeId) ?? providers[0];

export const loadAiSettings = async (): Promise<AiProvider | undefined> => activeProvider(await loadProviders());

export const isAiConfigured = <T extends AiSettings>(settings: T | undefined): settings is T => Boolean(settings?.baseUrl && settings.model);

/** Trims and drops trailing slashes; throws when it isn't an http(s) URL. */
export const normalizeBaseUrl = (value: string): string => {
	const trimmed = value.trim().replace(TRAILING_SLASHES, "");
	const url = new URL(trimmed);
	if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use an http:// or https:// URL.");
	return trimmed;
};

/** Host-permission match pattern covering the API's origin, e.g. `https://api.openai.com/*`. */
export const originPattern = (baseUrl: string): string => `${new URL(baseUrl).origin}/*`;

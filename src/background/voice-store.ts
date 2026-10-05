/**
 * Storage for the voice samples. Runs only in the background worker: the encryption key lives in
 * the extension's IndexedDB, which a content script on linkedin.com can't reach (it would get
 * linkedin.com's own database instead).
 */
import { decryptApiKey, encryptApiKey } from "../crypto-key";
import { cleanSamples } from "../lib/voice-settings";

const STORAGE_KEY = "voiceSamples";

const asStrings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

export const writeVoiceSamples = async (samples: readonly string[]): Promise<void> => {
	const sealed = await encryptApiKey(JSON.stringify(cleanSamples(samples)));
	await chrome.storage.local.set({ [STORAGE_KEY]: sealed });
};

/** Saved samples, or none when they can't be read or decrypted. */
export const readVoiceSamples = async (): Promise<string[]> => {
	const stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];

	// Samples saved as a plain list by an older version are re-saved encrypted.
	if (Array.isArray(stored)) {
		const samples = cleanSamples(asStrings(stored));
		await writeVoiceSamples(samples);
		return samples;
	}
	if (typeof stored !== "string") return [];
	try {
		return cleanSamples(asStrings(JSON.parse(await decryptApiKey(stored))));
	} catch {
		return [];
	}
};

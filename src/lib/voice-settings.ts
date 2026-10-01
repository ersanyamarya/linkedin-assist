/**
 * The user's own writing samples, kept in `chrome.storage.local` and added to prompts so
 * generated text sounds like them. Unlike the AI token these aren't secret, so content scripts
 * read them directly.
 */

const STORAGE_KEY = "voiceSamples";
export const MAX_VOICE_SAMPLES = 5;
export const MAX_VOICE_SAMPLE_LENGTH = 600;
/** Samples are written in one box, separated by a line holding only `---`. */
const SAMPLE_SEPARATOR = /^\s*---\s*$/m;

const cleanSamples = (samples: readonly string[]): string[] =>
	samples
		.map((sample) => sample.trim().slice(0, MAX_VOICE_SAMPLE_LENGTH))
		.filter(Boolean)
		.slice(0, MAX_VOICE_SAMPLES);

export const parseVoiceSamples = (text: string): string[] => cleanSamples(text.split(SAMPLE_SEPARATOR));

export const formatVoiceSamples = (samples: readonly string[]): string => samples.join("\n\n---\n\n");

/** Saved samples, or none when storage can't be read (for example after the extension reloaded). */
export const loadVoiceSamples = async (): Promise<string[]> => {
	try {
		const stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
		return Array.isArray(stored) ? cleanSamples(stored.filter((sample): sample is string => typeof sample === "string")) : [];
	} catch {
		return [];
	}
};

export const saveVoiceSamples = (samples: readonly string[]): Promise<void> => chrome.storage.local.set({ [STORAGE_KEY]: cleanSamples(samples) });

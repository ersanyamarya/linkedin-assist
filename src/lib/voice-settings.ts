/**
 * The user's own writing samples, added to prompts so generated text sounds like them.
 * They live in `chrome.storage.local`, but only the background worker touches storage
 * (`src/background/voice-store.ts`, encrypted). Content scripts and the options page ask the
 * worker over runtime messages, so nothing here reads storage directly.
 */

export type VoiceRuntimeMessage = { type: "voice-load" } | { type: "voice-save"; samples: string[] };

export const MAX_VOICE_SAMPLES = 5;
export const MAX_VOICE_SAMPLE_LENGTH = 600;
/** Samples are written in one box, separated by a line holding only `---`. */
const SAMPLE_SEPARATOR = /^\s*---\s*$/m;

export const cleanSamples = (samples: readonly string[]): string[] =>
	samples
		.map((sample) => sample.trim().slice(0, MAX_VOICE_SAMPLE_LENGTH))
		.filter(Boolean)
		.slice(0, MAX_VOICE_SAMPLES);

export const parseVoiceSamples = (text: string): string[] => cleanSamples(text.split(SAMPLE_SEPARATOR));

export const formatVoiceSamples = (samples: readonly string[]): string => samples.join("\n\n---\n\n");

/** Saved samples, or none when the worker can't be reached (for example after the extension reloaded). */
export const loadVoiceSamples = async (): Promise<string[]> => {
	try {
		const reply: unknown = await chrome.runtime.sendMessage({ type: "voice-load" } satisfies VoiceRuntimeMessage);
		return Array.isArray(reply) ? cleanSamples(reply.filter((sample): sample is string => typeof sample === "string")) : [];
	} catch {
		return [];
	}
};

/** Only extension pages (the options page) may save; the worker rejects the same message from content scripts. */
export const saveVoiceSamples = async (samples: readonly string[]): Promise<void> => {
	const saved: unknown = await chrome.runtime.sendMessage({ type: "voice-save", samples: cleanSamples(samples) } satisfies VoiceRuntimeMessage);
	if (saved !== true) throw new Error("Couldn't save your samples. Reload the extension and try again.");
};

/**
 * Thin wrapper over the `openai` SDK for any OpenAI-compatible server (OpenAI, OpenRouter,
 * Groq, Ollama, LM Studio, vLLM...). Uses Chat Completions, which those servers all implement.
 * Runs only in extension contexts (background worker, options page), never in content scripts.
 */
import OpenAI, { APIConnectionError, APIError } from "openai";
import type { AiConnection, AiSettings } from "./ai-settings";

// Local servers often need no token, but the SDK refuses to start without one.
const NO_TOKEN_PLACEHOLDER = "not-needed";

const createClient = ({ baseUrl, apiKey }: AiConnection): OpenAI =>
	new OpenAI({ baseURL: baseUrl, apiKey: apiKey || NO_TOKEN_PLACEHOLDER, dangerouslyAllowBrowser: true, maxRetries: 1 });

export const listModels = async (connection: AiConnection): Promise<string[]> => {
	const ids: string[] = [];
	for await (const model of createClient(connection).models.list()) ids.push(model.id);
	return ids.sort((a, b) => a.localeCompare(b));
};

/** Yields the reply to `prompt` piece by piece as the server streams it. */
export async function* streamChat(settings: AiSettings, prompt: string, signal: AbortSignal): AsyncGenerator<string> {
	const stream = await createClient(settings).chat.completions.create(
		{ model: settings.model, messages: [{ role: "user", content: prompt }], stream: true },
		{ signal }
	);
	for await (const chunk of stream) {
		const text = chunk.choices[0]?.delta?.content;
		if (text) yield text;
	}
}

/** A short, human explanation of an SDK/network error. */
export const describeAiError = (err: unknown): string => {
	if (err instanceof APIConnectionError) return "Couldn't reach the server. Check the base URL and that the server is running.";
	if (err instanceof APIError) {
		if (err.status === 401 || err.status === 403) return "The server rejected the API token.";
		if (err.status === 404) return "Not found. Check the base URL (it usually ends in /v1) and the model name.";
		if (err.status === 429) return "Rate limited or out of credits. Try again in a moment.";
		return `The server returned an error${err.status ? ` (${err.status})` : ""}: ${err.message}`;
	}
	return err instanceof Error ? err.message : String(err);
};

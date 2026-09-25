/**
 * Options page: set the OpenAI-compatible base URL, token and model used for "Generate".
 * Saving (or loading models) asks Chrome for access to that one server's origin.
 */
import { describeAiError, listModels } from "../lib/ai-client";
import { type AiConnection, clearAiSettings, loadAiSettings, normalizeBaseUrl, originPattern, saveAiSettings } from "../lib/ai-settings";

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const form = byId<HTMLFormElement>("ai-form");
const baseUrlInput = byId<HTMLInputElement>("base-url");
const apiKeyInput = byId<HTMLInputElement>("api-key");
const modelInput = byId<HTMLInputElement>("model");
const modelList = byId<HTMLDataListElement>("model-list");
const toggleKeyBtn = byId<HTMLButtonElement>("toggle-key");
const loadModelsBtn = byId<HTMLButtonElement>("load-models");
const removeBtn = byId<HTMLButtonElement>("remove");
const status = byId<HTMLParagraphElement>("status");

const setStatus = (message: string, tone: "info" | "error" | "success" = "info") => {
	status.textContent = message;
	status.dataset.tone = tone;
};

/** Reads the URL and token fields, or shows why the URL is invalid and returns undefined. */
const readConnection = (): AiConnection | undefined => {
	try {
		return { baseUrl: normalizeBaseUrl(baseUrlInput.value), apiKey: apiKeyInput.value.trim() };
	} catch {
		setStatus("Enter a valid base URL, like https://api.openai.com/v1.", "error");
		baseUrlInput.focus();
		return;
	}
};

/** Must run before any other await in a click handler: Chrome only shows the prompt during a user gesture. */
const requestAccess = async (baseUrl: string): Promise<boolean> => {
	const granted = await chrome.permissions.request({ origins: [originPattern(baseUrl)] });
	if (!granted) setStatus(`Access to ${new URL(baseUrl).host} is needed to talk to it.`, "error");
	return granted;
};

const withBusy = async (button: HTMLButtonElement, task: () => Promise<void>) => {
	button.disabled = true;
	try {
		await task();
	} finally {
		button.disabled = false;
	}
};

toggleKeyBtn.addEventListener("click", () => {
	const hidden = apiKeyInput.type === "password";
	apiKeyInput.type = hidden ? "text" : "password";
	toggleKeyBtn.textContent = hidden ? "Hide" : "Show";
});

loadModelsBtn.addEventListener("click", () => {
	const connection = readConnection();
	if (!connection) return;
	withBusy(loadModelsBtn, async () => {
		if (!(await requestAccess(connection.baseUrl))) return;
		setStatus("Loading models...");
		try {
			const models = await listModels(connection);
			modelList.replaceChildren(...models.map((id) => new Option(id, id)));
			if (!modelInput.value && models[0]) modelInput.value = models[0];
			setStatus(
				models.length ? `Found ${models.length} models. Pick one from the Model field.` : "The server returned no models. Type a model name.",
				"success"
			);
			modelInput.focus();
		} catch (err) {
			setStatus(describeAiError(err), "error");
		}
	});
});

form.addEventListener("submit", (event) => {
	event.preventDefault();
	const connection = readConnection();
	if (!connection) return;
	const model = modelInput.value.trim();
	withBusy(form.querySelector<HTMLButtonElement>("button[type=submit]") as HTMLButtonElement, async () => {
		if (!(await requestAccess(connection.baseUrl))) return;
		await saveAiSettings({ ...connection, model });
		baseUrlInput.value = connection.baseUrl;
		setStatus("Saved. Prompt windows on LinkedIn now show a Generate button.", "success");
	});
});

removeBtn.addEventListener("click", async () => {
	const saved = await loadAiSettings();
	await clearAiSettings();
	if (saved?.baseUrl) await chrome.permissions.remove({ origins: [originPattern(saved.baseUrl)] }).catch(() => {});
	form.reset();
	modelList.replaceChildren();
	setStatus("Removed. Prompt windows go back to copy only.");
});

loadAiSettings().then((saved) => {
	if (!saved) return;
	baseUrlInput.value = saved.baseUrl;
	apiKeyInput.value = saved.apiKey;
	modelInput.value = saved.model;
});

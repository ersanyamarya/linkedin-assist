/**
 * Options page: keep several OpenAI-compatible providers (base URL, token, model), choose the one
 * "Generate" uses, and edit them. Saving (or loading models) asks Chrome for access to that one
 * server's origin.
 */
import { describeAiError, listModels } from "../lib/ai-client";
import {
	type AiConnection,
	type AiProvider,
	type AiProviders,
	activeProvider,
	hostOf,
	loadProviders,
	normalizeBaseUrl,
	originPattern,
	saveProviders,
} from "../lib/ai-settings";
import { formatVoiceSamples, loadVoiceSamples, MAX_VOICE_SAMPLE_LENGTH, MAX_VOICE_SAMPLES, parseVoiceSamples, saveVoiceSamples } from "../lib/voice-settings";
import { el } from "../ui/components/dom";

const CUSTOM_MODEL = "__custom__";

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const form = byId<HTMLFormElement>("ai-form");
const formHeading = byId<HTMLHeadingElement>("form-heading");
const providerList = byId<HTMLDivElement>("provider-list");
const emptyHint = byId<HTMLParagraphElement>("empty");
const addBtn = byId<HTMLButtonElement>("add-provider");
const nameInput = byId<HTMLInputElement>("name");
const baseUrlInput = byId<HTMLInputElement>("base-url");
const apiKeyInput = byId<HTMLInputElement>("api-key");
const modelSelect = byId<HTMLSelectElement>("model");
const modelCustom = byId<HTMLInputElement>("model-custom");
const modelHint = byId<HTMLElement>("model-hint");
const toggleKeyBtn = byId<HTMLButtonElement>("toggle-key");
const loadModelsBtn = byId<HTMLButtonElement>("load-models");
const saveBtn = byId<HTMLButtonElement>("save");
const removeBtn = byId<HTMLButtonElement>("remove");
const status = byId<HTMLParagraphElement>("status");

let state: AiProviders = { providers: [] };
/** The provider shown in the form; undefined while adding a new one. */
let editingId: string | undefined;
/** Models found the last time the list was loaded for the provider in the form. */
let knownModels: string[] = [];

const setStatus = (message: string, tone: "info" | "error" | "success" = "info") => {
	status.textContent = message;
	status.dataset.tone = tone;
};

/** Reads the URL and token fields, or shows why the URL is invalid and returns undefined. */
const readConnection = (): AiConnection | undefined => {
	try {
		return { baseUrl: normalizeBaseUrl(baseUrlInput.value), apiKey: apiKeyInput.value.trim() };
	} catch (error) {
		// `new URL` throws a TypeError; the other errors carry a specific reason worth showing.
		const invalid = error instanceof TypeError || !(error instanceof Error);
		setStatus(invalid ? "Enter a valid base URL, like https://api.openai.com/v1." : error.message, "error");
		baseUrlInput.focus();
		return;
	}
};

/** Must run before any other await in a click handler: Chrome only shows the prompt during a user gesture. */
const requestAccess = async (baseUrl: string): Promise<boolean> => {
	const granted = await chrome.permissions.request({ origins: [originPattern(baseUrl)] });
	if (!granted) setStatus(`Access to ${hostOf(baseUrl)} is needed to talk to it.`, "error");
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

/** Applies `change` to the freshest saved list (the prompt window can switch providers meanwhile) and saves it. */
const updateProviders = async (change: (current: AiProviders) => AiProviders) => {
	state = change(await loadProviders());
	await saveProviders(state);
};

// --- Model field: a dropdown once the list is known, plus a "type a name" fallback ---

const syncModelInputs = () => {
	modelCustom.hidden = !modelSelect.hidden && modelSelect.value !== CUSTOM_MODEL;
};

const getModel = (): string => (modelSelect.hidden || modelSelect.value === CUSTOM_MODEL ? modelCustom.value : modelSelect.value).trim();

const setModelChoices = (models: string[], selected: string) => {
	knownModels = models;
	const choices = selected && !models.includes(selected) ? [selected, ...models] : models;
	modelSelect.hidden = choices.length === 0;
	modelSelect.replaceChildren(
		...(selected ? [] : [new Option("Choose a model", "")]),
		...choices.map((id) => new Option(id, id)),
		new Option("Type a name...", CUSTOM_MODEL)
	);
	modelSelect.value = selected;
	modelCustom.value = "";
	syncModelInputs();
	modelHint.textContent = models.length
		? `${models.length} models found. Choose one, or pick "Type a name..." for a model that isn't listed.`
		: "Click Load models to list what the server offers, or type a model name.";
};

modelSelect.addEventListener("change", () => {
	syncModelInputs();
	if (modelSelect.value === CUSTOM_MODEL) modelCustom.focus();
});

// --- Provider list ---

const renderList = () => {
	const inUseId = activeProvider(state)?.id;
	emptyHint.hidden = state.providers.length > 0;
	providerList.replaceChildren(
		...state.providers.map((provider) => {
			const radio = el("input", {
				type: "radio",
				name: "active-provider",
				className: "la-provider__radio",
				checked: provider.id === inUseId,
				"aria-label": `Use ${provider.name}`,
			});
			radio.addEventListener("change", () => useProvider(provider));

			const body = el("button", { type: "button", className: "la-provider__body" }, [
				el("span", { className: "la-provider__name" }, [provider.name]),
				el("span", { className: "la-provider__meta" }, [`${provider.model} · ${hostOf(provider.baseUrl)}`]),
			]);
			body.addEventListener("click", () => editProvider(provider.id));

			return el("div", { className: "la-provider", "aria-current": String(provider.id === editingId) }, [
				radio,
				body,
				...(provider.id === inUseId ? [el("span", { className: "la-provider__badge" }, ["In use"])] : []),
			]);
		})
	);
};

const useProvider = async (provider: AiProvider) => {
	await updateProviders((current) => ({ ...current, activeId: provider.id }));
	renderList();
	setStatus(`Now using ${provider.name}. Prompt windows on LinkedIn generate with it.`, "success");
};

/** Loads a saved provider into the form, or blank fields when `id` is undefined. */
const editProvider = (id?: string) => {
	const provider = state.providers.find((p) => p.id === id);
	editingId = provider?.id;
	formHeading.textContent = provider ? "Edit provider" : "Add provider";
	nameInput.value = provider?.name ?? "";
	baseUrlInput.value = provider?.baseUrl ?? "";
	apiKeyInput.value = provider?.apiKey ?? "";
	apiKeyInput.type = "password";
	toggleKeyBtn.textContent = "Show";
	setModelChoices(provider?.models ?? [], provider?.model ?? "");
	removeBtn.hidden = !provider;
	setStatus("");
	renderList();
};

// --- Actions ---

toggleKeyBtn.addEventListener("click", () => {
	const hidden = apiKeyInput.type === "password";
	apiKeyInput.type = hidden ? "text" : "password";
	toggleKeyBtn.textContent = hidden ? "Hide" : "Show";
});

addBtn.addEventListener("click", () => {
	editProvider();
	nameInput.focus();
});

loadModelsBtn.addEventListener("click", () => {
	const connection = readConnection();
	if (!connection) return;
	withBusy(loadModelsBtn, async () => {
		if (!(await requestAccess(connection.baseUrl))) return;
		setStatus("Loading models...");
		try {
			const found = await listModels(connection);
			setModelChoices(found, getModel());
			// Keep the list for a saved provider right away, so it's still there when the page is reopened.
			const savedId = editingId;
			if (savedId)
				await updateProviders((current) => ({ ...current, providers: current.providers.map((p) => (p.id === savedId ? { ...p, models: found } : p)) }));
			setStatus(found.length ? `Found ${found.length} models.` : "The server returned no models. Type a model name.", found.length ? "success" : "info");
			(modelSelect.hidden ? modelCustom : modelSelect).focus();
		} catch (err) {
			setStatus(describeAiError(err), "error");
		}
	});
});

form.addEventListener("submit", (event) => {
	event.preventDefault();
	const connection = readConnection();
	if (!connection) return;
	const model = getModel();
	if (!model) {
		setStatus("Choose or type a model.", "error");
		(modelSelect.hidden || modelSelect.value === CUSTOM_MODEL ? modelCustom : modelSelect).focus();
		return;
	}

	withBusy(saveBtn, async () => {
		if (!(await requestAccess(connection.baseUrl))) return;
		const provider: AiProvider = {
			...connection,
			model,
			models: knownModels,
			id: editingId ?? crypto.randomUUID(),
			name: nameInput.value.trim() || hostOf(connection.baseUrl),
		};
		await updateProviders((current) => {
			const exists = current.providers.some((p) => p.id === provider.id);
			const providers = exists ? current.providers.map((p) => (p.id === provider.id ? provider : p)) : [...current.providers, provider];
			const keepActive = providers.some((p) => p.id === current.activeId);
			return { providers, activeId: keepActive ? current.activeId : provider.id };
		});
		editingId = provider.id;
		formHeading.textContent = "Edit provider";
		nameInput.value = provider.name;
		baseUrlInput.value = provider.baseUrl;
		removeBtn.hidden = false;
		renderList();
		const inUse = activeProvider(state)?.id === provider.id;
		setStatus(inUse ? "Saved. Prompt windows on LinkedIn generate with it." : "Saved. Select it in the list above to generate with it.", "success");
	});
});

removeBtn.addEventListener("click", async () => {
	const target = state.providers.find((p) => p.id === editingId);
	if (!(target && window.confirm(`Remove ${target.name}? Its token is deleted from this browser.`))) return;

	await updateProviders((current) => {
		const providers = current.providers.filter((p) => p.id !== target.id);
		const keepActive = providers.some((p) => p.id === current.activeId);
		return { providers, activeId: keepActive ? current.activeId : providers[0]?.id };
	});
	// Give back access to the server unless another provider shares it.
	const origin = originPattern(target.baseUrl);
	if (!state.providers.some((p) => originPattern(p.baseUrl) === origin)) await chrome.permissions.remove({ origins: [origin] }).catch(() => {});

	editProvider(activeProvider(state)?.id);
	setStatus(`Removed ${target.name}.`);
});

loadProviders().then((loaded) => {
	state = loaded;
	editProvider(activeProvider(state)?.id);
});

// --- Writing voice: samples that are added to every prompt so generated text sounds like you ---

const voiceForm = byId<HTMLFormElement>("voice-form");
const voiceInput = byId<HTMLTextAreaElement>("voice-samples");
const voiceHint = byId<HTMLElement>("voice-hint");
const voiceStatus = byId<HTMLParagraphElement>("voice-status");
const clearVoiceBtn = byId<HTMLButtonElement>("clear-voice");

const setVoiceStatus = (message: string, tone: "info" | "success" = "info") => {
	voiceStatus.textContent = message;
	voiceStatus.dataset.tone = tone;
};

const syncVoiceHint = () => {
	const count = parseVoiceSamples(voiceInput.value).length;
	voiceHint.textContent = `${count} of ${MAX_VOICE_SAMPLES} samples, up to ${MAX_VOICE_SAMPLE_LENGTH} characters each. 3 to 5 is plenty. They are added to every prompt, so leave out anything private.`;
};

voiceInput.addEventListener("input", () => {
	setVoiceStatus("");
	syncVoiceHint();
});

voiceForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	const samples = parseVoiceSamples(voiceInput.value);
	await saveVoiceSamples(samples);
	voiceInput.value = formatVoiceSamples(samples);
	syncVoiceHint();
	setVoiceStatus(samples.length ? "Saved. New prompts include these samples." : "Saved. Prompts no longer include writing samples.", "success");
});

clearVoiceBtn.addEventListener("click", async () => {
	await saveVoiceSamples([]);
	voiceInput.value = "";
	syncVoiceHint();
	setVoiceStatus("Cleared.", "success");
});

loadVoiceSamples().then((samples) => {
	voiceInput.value = formatVoiceSamples(samples);
	syncVoiceHint();
});

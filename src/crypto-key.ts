/**
 * Encrypts the API key before it is written to `chrome.storage.local` (AES-GCM, Web Crypto).
 * The AES key is non-extractable and lives in IndexedDB, so a copy of the storage area alone
 * does not reveal the token. Only the background worker and options page should call these.
 */

const DB_NAME = "linkedin-assist-crypto";
const STORE = "keys";
const KEY_ID = "api-key-v1";
const IV_BYTES = 12;
const VERSION_PREFIX = "v1:";

const openDb = (): Promise<IDBDatabase> =>
	new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => request.result.createObjectStore(STORE);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

const idbRequest = <T>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
	new Promise((resolve, reject) => {
		const request = run(db.transaction(STORE, mode).objectStore(STORE));
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

const getKey = async (): Promise<CryptoKey> => {
	const db = await openDb();
	try {
		const existing = await idbRequest<CryptoKey | undefined>(db, "readonly", (s) => s.get(KEY_ID));
		if (existing) return existing;
		const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
		await idbRequest(db, "readwrite", (s) => s.put(key, KEY_ID));
		return key;
	} finally {
		db.close();
	}
};

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

/** Returns `v1:<iv>:<ciphertext>` (base64), safe to store as a string. */
export const encryptApiKey = async (apiKey: string): Promise<string> => {
	const key = await getKey();
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
	const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(apiKey));
	return `${VERSION_PREFIX}${toBase64(iv)}:${toBase64(new Uint8Array(cipher))}`;
};

/** Throws when the payload is malformed, was tampered with, or the key is gone. */
export const decryptApiKey = async (payload: string): Promise<string> => {
	if (!payload.startsWith(VERSION_PREFIX)) throw new Error("Unsupported encrypted key format.");
	const [iv, cipher] = payload.slice(VERSION_PREFIX.length).split(":");
	if (!(iv && cipher)) throw new Error("Malformed encrypted key.");
	const key = await getKey();
	const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(cipher));
	return new TextDecoder().decode(plain);
};

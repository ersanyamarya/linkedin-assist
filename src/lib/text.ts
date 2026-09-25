/** Collapses runs of whitespace (including newlines) to single spaces and trims. */
export const normalizeWhitespace = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();

import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SOURCE = "public/logo.svg";
const OUT_DIR = "public/icons";

// Chrome extensions need PNG icons; SVG is not accepted.
// The Web Store wants the 128px icon as 96px of artwork inside 16px of transparent padding.
const SIZES = [
	{ size: 16, pad: 0, usage: "Favicon" },
	{ size: 48, pad: 2, usage: "Extension toolbar" },
	{ size: 128, pad: 16, usage: "Store listing thumbnail" },
] as const;

const SUPERSAMPLE = 8;

async function main() {
	const svg = await readFile(SOURCE).catch(() => {
		throw new Error(`Missing ${SOURCE}. Create the logo first.`);
	});
	await mkdir(OUT_DIR, { recursive: true });

	for (const { size, pad, usage } of SIZES) {
		const file = join(OUT_DIR, `icon-${size}.png`);
		const art = size - pad * 2;
		// Rasterize large and trim the empty margin, so `pad` alone controls the spacing.
		const big = await sharp(svg, { density: 72 * SUPERSAMPLE })
			.resize(size * SUPERSAMPLE, size * SUPERSAMPLE)
			.png()
			.toBuffer();
		const tight = await sharp(big).trim().toBuffer();
		const fitted = await sharp(tight)
			.resize(art, art, { fit: "inside", kernel: "lanczos3", background: { r: 0, g: 0, b: 0, alpha: 0 } })
			.toBuffer();
		const { width, height } = await sharp(fitted).metadata();
		await sharp(fitted)
			.extend({
				top: Math.floor((size - height) / 2),
				bottom: Math.ceil((size - height) / 2),
				left: Math.floor((size - width) / 2),
				right: Math.ceil((size - width) / 2),
				background: { r: 0, g: 0, b: 0, alpha: 0 },
			})
			.png({ compressionLevel: 9 })
			.toFile(file);
		console.log(`${file}  ${size}x${size}  ${usage}`);
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});

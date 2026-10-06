/**
 * Chrome Web Store listing images, rendered from the extension's own UI and styles.
 *
 * Output (store-assets/), per the Web Store requirements:
 *   screenshot-*.png   1280x800  (up to 5, 24-bit PNG, no alpha)
 *   promo-small.png     440x280  (small promo tile)
 *   promo-marquee.png  1400x560  (marquee promo tile, optional)
 * The 128px store icon comes from `bun run icons`.
 */
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type Browser, chromium, type Page } from "playwright-core";
import sharp from "sharp";

const OUT_DIR = "store-assets";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const BLUE = "#0a66c2";
// Single quotes: this string is also used inside style="" attributes.
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const SCENE = {
	post: "We cut our release cycle from two weeks to two days by deleting meetings, not by adding tools. The biggest lesson: small batches expose problems while they are still cheap to fix.",
	comments: ["Did the on-call load change once releases got smaller?", "We did the same last year. Fewer approvals mattered more than faster CI."],
	profile: { name: "Alex Rivera", headline: "Product designer at Northwind", location: "Lisbon, Portugal" },
	commentTake: "Small batches also made our rollbacks boring. Happy to share how we set the review rules.",
	commentReply:
		"Small batches made our rollbacks boring too. When a release is a handful of changes, finding the cause takes minutes. We also capped review time at a day, which did more for speed than any tooling change.",
	noteTake: "We both spoke about design systems at last month's Lisbon meetup, and I liked your point on tokens.",
	noteReply: "Hi Alex, I enjoyed your talk on design tokens at the Lisbon meetup. I'd like to stay in touch and swap notes on design systems.",
};

const CAPTIONS = {
	comment: ["Say what you think, pick a tone", "Your take shapes every comment and reply."],
	answer: ["Get a draft you can edit and insert", "Generate here, tweak the text, then insert it into the comment box."],
	note: ["Connection notes that fit the limit", "200 characters on a free account, 300 with Premium."],
	provider: ["Bring your own AI provider", "Any OpenAI-compatible API, including local models. Optional."],
} as const;

const shellCss = (styles: string) => `${styles}
*{box-sizing:border-box}
body{margin:0;width:1280px;height:800px;overflow:hidden;background:#f3f2ef;font-family:${FONT}}
.cap{position:fixed;top:0;left:0;right:0;height:116px;z-index:20000;background:#fff;border-bottom:1px solid #e2e2e2;
  display:flex;flex-direction:column;justify-content:center;padding:0 64px}
.cap h1{margin:0;font-size:38px;font-weight:600;color:#111;letter-spacing:-0.01em}
.cap p{margin:6px 0 0;font-size:20px;color:#555}
.cap::after{content:"";position:absolute;left:0;bottom:-1px;width:160px;height:3px;background:${BLUE}}
.feed{position:absolute;top:116px;left:0;right:0;bottom:0;padding:32px 0;display:flex;flex-direction:column;gap:20px;align-items:center}
.card{width:620px;height:260px;background:#fff;border-radius:8px;border:1px solid #e2e2e2;padding:20px}
.card i{display:block;height:12px;border-radius:6px;background:#e9e8e4;margin-bottom:14px}
.la-modal{align-items:flex-start;padding-top:140px;background:rgba(20,30,45,.3);animation:none}
.la-modal__box{max-height:630px;animation:none}
`;

const shell = (styles: string, caption: readonly [string, string]) => `<!doctype html><html><head><meta charset="utf-8">
<style>${shellCss(styles)}</style></head><body>
<header class="cap"><h1>${caption[0]}</h1><p>${caption[1]}</p></header>
<main class="feed"><div class="card"><i style="width:38%"></i><i></i><i style="width:92%"></i><i style="width:70%"></i></div><div class="card"><i style="width:30%"></i><i></i><i style="width:80%"></i></div></main>
</body></html>`;

const finish = async (png: Buffer, file: string) => {
	// The Web Store rejects images with an alpha channel.
	await sharp(png).flatten({ background: "#ffffff" }).removeAlpha().png({ compressionLevel: 9 }).toFile(join(OUT_DIR, file));
	console.log(`${join(OUT_DIR, file)}`);
};

/** A fresh page per scene: the bundle declares top-level bindings that can't be redeclared. */
const modalScene = async (browser: Browser, bundle: string, styles: string, caption: readonly [string, string]): Promise<Page> => {
	const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
	page.on("pageerror", (error) => console.error("page error:", error.message));
	await page.setContent(shell(styles, caption));
	await page.addScriptTag({ content: bundle });
	return page;
};

const generateReply = async (page: Page) => {
	await page.getByRole("button", { name: "Generate", exact: true }).click();
	await page.waitForFunction(() => document.querySelector(".la-prompt-panel--output")?.textContent?.includes("."), undefined, { timeout: 10_000 });
	await page.waitForTimeout(250);
};

const logoDataUri = async () => `data:image/svg+xml;base64,${(await readFile("public/logo.svg")).toString("base64")}`;

const badge = (logo: string, size: number) =>
	`<div style="width:${size}px;height:${size}px;border-radius:50%;background:#fff;display:grid;place-items:center;flex:none"><img src="${logo}" width="${size * 0.68}" height="${size * 0.68}"></div>`;

const promoSmall = (
	logo: string
) => `<!doctype html><body style="margin:0;width:440px;height:280px;background:${BLUE};font-family:${FONT};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center">
${badge(logo, 96)}
<div style="font-size:38px;font-weight:600;letter-spacing:-0.01em">LinkedIn Assist</div>
<div style="font-size:19px;line-height:1.3;opacity:.92;max-width:340px">Draft comments, replies, and connection notes</div></body>`;

const promoMarquee = (
	logo: string,
	modal: string
) => `<!doctype html><body style="margin:0;width:1400px;height:560px;background:${BLUE};font-family:${FONT};color:#fff;position:relative;overflow:hidden">
<div style="position:absolute;left:96px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:22px;width:560px">
${badge(logo, 112)}
<div style="font-size:64px;font-weight:600;letter-spacing:-0.02em;line-height:1.05">LinkedIn Assist</div>
<div style="font-size:28px;line-height:1.35;opacity:.92">Draft comments, replies, and connection notes. Bring your own AI provider.</div></div>
<img src="${modal}" style="position:absolute;left:740px;top:70px;width:560px;border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.35)"></body>`;

async function main() {
	await mkdir(OUT_DIR, { recursive: true });
	const styles = await readFile("public/styles.css", "utf8");
	const built = await Bun.build({ entrypoints: ["scripts/image-gen-tools/store-harness.ts"], target: "browser" });
	if (!built.success) throw new Error(`Harness build failed:\n${built.logs.join("\n")}`);
	const bundle = await built.outputs[0].text();
	const logo = await logoDataUri();

	const browser = await chromium.launch({ executablePath: CHROME }).catch(() => {
		throw new Error(`Chrome not found at ${CHROME}. Set CHROME_PATH to a Chrome or Chromium binary.`);
	});

	// 1. Comment form
	let page = await modalScene(browser, bundle, styles, CAPTIONS.comment);
	await page.evaluate((s) => (globalThis as never as { storeScenes: { openComment: (x: unknown) => void } }).storeScenes.openComment(s), {
		post: SCENE.post,
		comments: SCENE.comments,
		reply: SCENE.commentReply,
	});
	await page.locator(".la-modal textarea").first().fill(SCENE.commentTake);
	await finish(await page.screenshot(), "screenshot-1-comment.png");

	// 2. Generated answer
	await page.getByRole("button", { name: "Generate prompt" }).click();
	await generateReply(page);
	await page.evaluate(([title, sub]) => {
		const heading = document.querySelector(".cap h1");
		if (heading) heading.textContent = title;
		const subline = document.querySelector(".cap p");
		if (subline) subline.textContent = sub;
	}, CAPTIONS.answer);
	await finish(await page.screenshot(), "screenshot-2-answer.png");
	const modalPng = await page.locator(".la-modal__box").screenshot();

	// 3. Connection note
	await page.close();
	page = await modalScene(browser, bundle, styles, CAPTIONS.note);
	await page.evaluate((s) => (globalThis as never as { storeScenes: { openConnect: (x: unknown) => void } }).storeScenes.openConnect(s), {
		profile: SCENE.profile,
		reply: SCENE.noteReply,
	});
	await page.locator(".la-modal textarea").first().fill(SCENE.noteTake);
	await finish(await page.screenshot(), "screenshot-3-connection-note.png");

	// 4. Provider settings: the real options page, under a caption
	const dir = await mkdtemp(join(tmpdir(), "la-store-"));
	const optionsUrl = `file://${resolve("public/options.html")}`;
	await writeFile(
		join(dir, "options.html"),
		`<!doctype html><body style="margin:0;width:1280px;height:800px;background:#f3f2ef;overflow:hidden;font-family:${FONT}">
<style>.cap{height:116px;background:#fff;border-bottom:1px solid #e2e2e2;display:flex;flex-direction:column;justify-content:center;padding:0 64px;position:relative}
.cap h1{margin:0;font-size:38px;font-weight:600;color:#111;letter-spacing:-0.01em}.cap p{margin:6px 0 0;font-size:20px;color:#555}
.cap::after{content:"";position:absolute;left:0;bottom:-1px;width:160px;height:3px;background:${BLUE}}</style>
<header class="cap"><h1>${CAPTIONS.provider[0]}</h1><p>${CAPTIONS.provider[1]}</p></header>
<iframe src="${optionsUrl}" style="border:0;width:1280px;height:684px;display:block"></iframe></body>`
	);
	await page.goto(`file://${join(dir, "options.html")}`);
	await page.frameLocator("iframe").locator("#name").fill("OpenAI");
	await page.frameLocator("iframe").locator("#base-url").fill("https://api.openai.com/v1");
	await finish(await page.screenshot(), "screenshot-4-providers.png");

	// Promo tiles
	const tile = await browser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
	await tile.setContent(promoSmall(logo));
	await finish(await tile.screenshot(), "promo-small.png");
	await tile.setViewportSize({ width: 1400, height: 560 });
	await tile.setContent(promoMarquee(logo, `data:image/png;base64,${modalPng.toString("base64")}`));
	await finish(await tile.screenshot(), "promo-marquee.png");

	await browser.close();
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});

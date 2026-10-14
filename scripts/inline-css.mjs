// Vercel build step: inline styles.css into index.html so the homepage has no
// render-blocking stylesheet request. Edits the deploy checkout only; the
// committed index.html keeps its <link> so local previews work unchanged.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = join(root, "index.html");
const link = '<link rel="stylesheet" href="styles.css" />';

const css = readFileSync(join(root, "styles.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .join(" ");
if (/<\/style/i.test(css)) throw new Error("styles.css contains </style");

const html = readFileSync(htmlPath, "utf8");
if (!html.includes(link)) throw new Error(`index.html is missing ${link}`);
writeFileSync(htmlPath, html.replace(link, () => `<style>${css}</style>`));
console.log(`Inlined ${css.length} bytes of CSS into index.html`);

// Vercel build step: copy the site into public/ and inline styles.css into
// public/index.html so the homepage has no render-blocking stylesheet request.
// The committed index.html keeps its <link>, so local previews work unchanged.
import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public");

// Not served: function sources, build tooling and config, which Vercel hid
// before this build step existed. Dotfiles stay private except .well-known.
const skip = new Set(["api", "scripts", "public", "node_modules", "vercel.json", "README.md", "DESIGN.md"]);

rmSync(out, { recursive: true, force: true });
for (const name of readdirSync(root)) {
  if (skip.has(name) || (name.startsWith(".") && name !== ".well-known")) continue;
  cpSync(join(root, name), join(out, name), { recursive: true });
}

const htmlPath = join(out, "index.html");
const link = '<link rel="stylesheet" href="styles.css" />';

const css = readFileSync(join(out, "styles.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .join(" ");
if (/<\/style/i.test(css)) throw new Error("styles.css contains </style");

const html = readFileSync(htmlPath, "utf8");
if (!html.includes(link)) throw new Error(`index.html is missing ${link}`);
writeFileSync(htmlPath, html.replace(link, () => `<style>${css}</style>`));
console.log(`Inlined ${css.length} bytes of CSS into public/index.html`);

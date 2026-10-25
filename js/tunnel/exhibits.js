// The stops in the well, in falling order, and the object that falls with each.
// Words come from the page view (elements with data-exhibit), so the page
// stays the single source of truth for the content.
import * as THREE from "three";
import { buildObject } from "./props.js";

export const SECTIONS = [
  { id: "gov", no: "01", name: "Government systems" },
  { id: "personal", no: "02", name: "Personal projects" },
  { id: "arena", no: "03", name: "Systems Arena" },
  { id: "profile", no: "04", name: "Profile" },
  { id: "career", no: "05", name: "Career" },
  { id: "toolkit", no: "06", name: "Toolkit & education" },
  { id: "contact", no: "07", name: "Contact" },
];

const ORDER = [
  { key: "spake", section: "gov", prop: "radio" },
  { key: "spkb", section: "gov", prop: "laptop" },
  { key: "fms", section: "gov", prop: "truck" },
  { key: "kamitrack", section: "personal", prop: "phone" },
  { key: "runcloud", section: "personal", prop: "server" },
  { key: "kamching", section: "personal", prop: "die" },
  { key: "apidocs", section: "personal", prop: "docs" },
  { key: "arena", section: "arena", prop: "gamepad" },
  { key: "profile", section: "profile", prop: "hardhat" },
  { key: "job-yhcm", section: "career", prop: "briefcase" },
  { key: "job-aic", section: "career", prop: "chip" },
  { key: "job-risau", section: "career", prop: "cloud" },
  { key: "job-mesiniaga", section: "career", prop: "server" },
  { key: "job-aspen", section: "career", prop: "glove" },
  { key: "earlier", section: "career", prop: "wrench" },
  { key: "toolkit", section: "toolkit", prop: "toolbox" },
  { key: "education", section: "toolkit", prop: "cap" },
  { key: "contact", section: "contact", prop: "envelope" },
];

const PROP_SCALE = 1.6;

const clean = (s) => s.replace(/\s+/g, " ").trim();

function text(el, sel) {
  const n = sel ? el.querySelector(sel) : null;
  return n ? clean(n.textContent) : "";
}

// The srcset candidate closest to `min` pixels wide without going under it.
function pick(img, min) {
  if (!img) return "";
  const list = (img.getAttribute("srcset") || "")
    .split(",")
    .map((c) => c.trim().split(/\s+/))
    .filter((c) => c[0])
    .map(([url, w]) => ({ url, w: parseInt(w, 10) || 0 }))
    .sort((a, b) => a.w - b.w);
  const hit = list.find((c) => c.w >= min) || list[list.length - 1];
  return hit ? hit.url : img.getAttribute("src") || "";
}

// Pull an exhibit's words and image from its page element. The dialog uses this too.
export function describe(el) {
  const ds = el.dataset;
  const img = ds.img ? null : el.querySelector("img");
  return {
    title: ds.title || text(el, "h4, h3"),
    sub: ds.sub || text(el, ".reg-full, .job-org"),
    subLang: el.querySelector(".reg-full[lang]")?.getAttribute("lang") || "",
    tags: ds.tags || text(el, ".reg-meta span, .job-tools"),
    when: [...el.querySelectorAll(".job-when span")].map((s) => clean(s.textContent)).join(" · "),
    // Panels draw emblems bigger than the page does, so take the largest.
    img: ds.img || pick(img, 1000),
    shot: pick(img, 640),
    shotAlt: img ? img.alt : "",
  };
}

function sentences(str) {
  const s = clean(str);
  return s.match(/[^.!?]+[.!?]+(?=\s|$)/g) || (s ? [s] : []);
}

// One sentence for the panel; the full text stays in the details dialog.
function summary(el, sub) {
  const sources = el.matches("li, article")
    ? el.querySelectorAll(".reg-desc, .job-body > p:not(.job-org):not(.job-tools)")
    : el.querySelectorAll("p:not(.sec-intro):not(.arena-facts):not(.now-label):not(.toolkit-key):not(.form-note)");
  for (const p of sources) {
    for (const raw of sentences(p.textContent)) {
      const s = raw.trim();
      if (s && s !== sub) return s;
    }
  }
  return "";
}

export function buildStops(scene, doc) {
  const intro = {
    key: "intro",
    section: null,
    info: { title: text(doc, "#name"), sub: text(doc, ".hero-role"), tags: "" },
    desc: "",
    object: null,
  };
  const stops = [intro];
  for (const spec of ORDER) {
    const el = doc.querySelector(`[data-exhibit="${spec.key}"]`);
    if (!el) continue;
    const info = describe(el);
    const stop = {
      key: spec.key,
      el,
      info,
      section: SECTIONS.find((s) => s.id === spec.section),
      desc: summary(el, info.sub),
      stats: [...el.querySelectorAll(".figures tr")].map((tr) => ({ value: text(tr, "td"), label: text(tr, "th") })),
      channels: [...el.querySelectorAll(".channels > div")].map((d) => ({
        label: text(d, "dt"),
        link: d.querySelector("dd a"),
      })),
      object: null,
    };
    if (spec.prop) {
      const object = buildObject(spec.prop);
      object.scale.setScalar(PROP_SCALE);
      object.visible = false;
      object.userData.spin = new THREE.Vector3(0.35 + Math.random() * 0.3, 0.5 + Math.random() * 0.4, 0.2);
      scene.add(object);
      stop.object = object;
    }
    stops.push(stop);
  }
  return stops;
}

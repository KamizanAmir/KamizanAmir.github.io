// What hangs in the tunnel: station signs, lightbox panels, wall paint, props.
// Panel text comes from the page view (elements with data-exhibit), so the
// page stays the single source of truth for the content.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/RoundedBoxGeometry.js";
import { FLOOR_Y, TUNNEL, LANDING_D, PALETTES, zAt } from "./world.js";
import { buildProp } from "./props.js";

export const D_MIN = LANDING_D;
export const D_MAX = TUNNEL.length - 7;

export const STATIONS = [
  { id: "entrance", name: "Entrance", d: D_MIN },
  { id: "gov", no: "01", name: "Government systems", d: 12 },
  { id: "personal", no: "02", name: "Personal projects", d: 30 },
  { id: "arena", no: "03", name: "Systems Arena", d: 52 },
  { id: "profile", no: "04", name: "Profile", d: 63 },
  { id: "career", no: "05", name: "Career", d: 79 },
  { id: "toolkit", no: "06", name: "Toolkit & education", d: 104 },
  { id: "contact", no: "07", name: "Contact", d: 121 },
];

// side: -1 left wall, 1 right wall, 0 centre (the end of the tunnel)
const LAYOUT = [
  { key: "spake", d: 15, side: -1, prop: "radio", action: "View" },
  { key: "spkb", d: 19, side: 1, prop: "laptop", action: "View" },
  { key: "fms", d: 23, side: -1, prop: "truck", action: "View" },
  { key: "kamitrack", d: 33, side: 1, prop: "phone", action: "View" },
  { key: "runcloud", d: 37, side: -1, prop: "server", action: "View" },
  { key: "kamching", d: 41, side: 1, prop: "die", action: "View" },
  { key: "apidocs", d: 45, side: -1, prop: "docs", action: "View" },
  { key: "arena", d: 56, side: 1, type: "door", action: "Enter" },
  { key: "profile", d: 66, side: 1, prop: "hardhat", action: "Read" },
  { key: "job-yhcm", d: 82, side: -1, type: "plaque", action: "Read" },
  { key: "job-aic", d: 85, side: 1, type: "plaque", action: "Read" },
  { key: "job-risau", d: 88, side: -1, type: "plaque", action: "Read" },
  { key: "job-mesiniaga", d: 91, side: 1, type: "plaque", action: "Read" },
  { key: "job-aspen", d: 94, side: -1, type: "plaque", action: "Read" },
  { key: "earlier", d: 97, side: 1, type: "plaque", action: "Read" },
  { key: "toolkit", d: 107, side: -1, prop: "toolbox", action: "Open" },
  { key: "education", d: 111, side: 1, prop: "cap", action: "Open" },
  { key: "contact", d: TUNNEL.length - 3, side: 0, type: "end", action: "Get in touch:" },
];

const ANGLE = 0.55; // how far panels turn from the wall toward the visitor
const INK = "#1d1f22";
const INK_2 = "#5a5650";
const PAPER = "#fbf8f1";
const AMBER = "#f2a541";

function text(el, sel) {
  const n = sel ? el.querySelector(sel) : null;
  return n ? n.textContent.replace(/\s+/g, " ").trim() : "";
}

// Pull a panel's words and image from its page element.
export function describe(el) {
  const ds = el.dataset;
  const img = ds.img ? null : el.querySelector("img");
  // Prefer the largest candidate: panels draw emblems bigger than the page does.
  const best = img && img.srcset ? img.srcset.split(",").pop().trim().split(" ")[0] : "";
  return {
    title: ds.title || text(el, "h4, h3"),
    sub: ds.sub || text(el, ".reg-full, .job-org"),
    tags: ds.tags || text(el, ".reg-meta span, .job-tools"),
    when: text(el, ".job-when span"),
    img: ds.img || best || (img ? img.src : ""),
  };
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = src;
  });
}

function wrap(g, str, maxW, maxLines) {
  const words = str.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (g.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "…");
  }
  return lines;
}

function texture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// The lightbox face: emblem, kicker, title, subtitle, tags.
function panelCanvas(info, kicker, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = PAPER;
  g.beginPath();
  g.roundRect(0, 0, w, h, 40);
  g.fill();
  const pad = Math.round(w * 0.065);
  let y = pad;
  if (info.image) {
    const s = Math.round(h * 0.22);
    g.save();
    g.beginPath();
    g.roundRect(pad, y, s, s, s * 0.22);
    g.clip();
    g.drawImage(info.image, pad, y, s, s);
    g.restore();
    g.fillStyle = INK_2;
    g.font = `500 ${Math.round(h * 0.048)}px "Funnel Sans"`;
    g.fillText(kicker, pad + s + pad * 0.6, y + s * 0.6);
    y += s + pad * 0.9;
  } else {
    g.fillStyle = "#9a5200";
    g.font = `600 ${Math.round(h * 0.05)}px "Funnel Sans"`;
    g.fillText(kicker, pad, y + h * 0.05);
    y += h * 0.12;
  }
  const titleSize = Math.round(h * (info.title.length > 18 ? 0.105 : 0.135));
  g.fillStyle = INK;
  g.font = `700 ${titleSize}px "Funnel Display"`;
  for (const line of wrap(g, info.title, w - pad * 2, 2)) {
    y += titleSize * 1.02;
    g.fillText(line, pad, y);
  }
  const subSize = Math.round(h * 0.056);
  g.font = `400 ${subSize}px "Funnel Sans"`;
  g.fillStyle = INK_2;
  y += subSize * 0.5;
  for (const line of wrap(g, info.sub, w - pad * 2, 2)) {
    y += subSize * 1.3;
    g.fillText(line, pad, y);
  }
  if (info.tags) {
    const tagSize = Math.round(h * 0.044);
    g.font = `500 ${tagSize}px "Funnel Sans"`;
    g.fillStyle = INK;
    const lines = wrap(g, info.tags, w - pad * 2, 2);
    let ty = h - pad - (lines.length - 1) * tagSize * 1.3;
    for (const line of lines) {
      g.fillText(line, pad, ty);
      ty += tagSize * 1.3;
    }
  }
  return c;
}

function signCanvas(no, name, sub) {
  const c = document.createElement("canvas");
  c.width = 1400;
  c.height = 300;
  const g = c.getContext("2d");
  g.fillStyle = "#26282c";
  g.beginPath();
  g.roundRect(0, 0, c.width, c.height, 60);
  g.fill();
  let x = 80;
  if (no) {
    g.fillStyle = AMBER;
    g.font = '700 120px "Funnel Display"';
    g.fillText(no, x, 192);
    x += g.measureText(no).width + 50;
  }
  // Shrink the name until it fits the sign.
  const room = c.width - x - 80;
  let size = sub ? 104 : 116;
  g.font = `700 ${size}px "Funnel Display"`;
  while (g.measureText(name).width > room && size > 40) {
    size -= 4;
    g.font = `700 ${size}px "Funnel Display"`;
  }
  g.fillStyle = "#f3efe7";
  g.fillText(name, x, sub ? 150 : 192 - (116 - size) * 0.35);
  if (sub) {
    g.fillStyle = "#c9c2b6";
    g.font = '500 52px "Funnel Sans"';
    g.fillText(sub, x, 235);
  }
  return c;
}

// Key figures painted straight onto the tunnel wall.
function paintCanvas(figures, theme) {
  const p = PALETTES[theme];
  const c = document.createElement("canvas");
  c.width = 3072;
  c.height = 512;
  const g = c.getContext("2d");
  const col = c.width / figures.length;
  figures.forEach(([value, label], i) => {
    const x = i * col + 40;
    g.fillStyle = p.paint;
    g.font = '800 240px "Funnel Display"';
    g.fillText(value, x, 290);
    g.fillStyle = p.paintSoft;
    g.font = '500 54px "Funnel Sans"';
    wrap(g, label, col - 80, 2).forEach((line, li) => g.fillText(line, x + 6, 380 + li * 64));
  });
  return c;
}

const frameMat = new THREE.MeshStandardMaterial({ color: "#f3eee4", roughness: 0.7 });
const postMat = new THREE.MeshStandardMaterial({ color: "#2b2d31", roughness: 0.6 });

function lightbox(canvas, w, h) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new RoundedBoxGeometry(w + 0.08, h + 0.08, 0.07, 3, 0.04), frameMat);
  group.add(frame);
  const faceMat = new THREE.MeshBasicMaterial({ map: texture(canvas), color: "#e6e1d8" });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
  face.position.z = 0.037;
  group.add(face);
  return { group, face, faceMat };
}

function addPost(parent, x, z, top) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, top, 12), postMat);
  post.position.set(x, FLOOR_Y + top / 2, z);
  parent.add(post);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 24), postMat);
  foot.position.set(x, FLOOR_Y + 0.02, z);
  parent.add(foot);
}

function archDoor(image, parent, z) {
  // A recessed doorway on the right wall with the game showing through it.
  const w = 0.9; // half width
  const h = 1.3; // straight sides
  const s = new THREE.Shape();
  s.moveTo(-w, 0);
  s.lineTo(-w, h);
  s.absarc(0, h, w, Math.PI, 0, true);
  s.lineTo(w, 0);
  s.lineTo(-w, 0);
  const geo = new THREE.ShapeGeometry(s, 24);
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (pos.getX(i) + w) / (2 * w), pos.getY(i) / (h + w));
  }
  const tex = image ? texture(image) : null;
  if (tex) {
    // Crop the 1280x879 capture to the door's portrait shape.
    const aspect = (2 * w) / (h + w) / (image.width / image.height);
    tex.repeat.set(aspect, 1);
    tex.offset.set((1 - aspect) / 2, 0);
  }
  const screen = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ map: tex, color: tex ? "#ffffff" : "#26282c" }),
  );
  const group = new THREE.Group();
  group.add(screen);
  const frameGeo = new THREE.TorusGeometry(w + 0.05, 0.05, 8, 32, Math.PI);
  const amber = new THREE.MeshBasicMaterial({ color: AMBER });
  const top = new THREE.Mesh(frameGeo, amber);
  top.position.y = h;
  group.add(top);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 8), amber);
    side.position.set(sx * (w + 0.05), h / 2, 0);
    group.add(side);
  }
  group.rotation.y = -Math.PI / 2;
  group.position.set(TUNNEL.halfWidth - 0.04, FLOOR_Y, z);
  parent.add(group);
  return { group, face: screen, faceMat: screen.material };
}

export async function buildExhibits(scene, doc, theme) {
  await Promise.all([
    document.fonts.load('700 64px "Funnel Display"'),
    document.fonts.load('800 64px "Funnel Display"'),
    document.fonts.load('400 32px "Funnel Sans"'),
    document.fonts.load('500 32px "Funnel Sans"'),
  ]).catch(() => {});

  const group = new THREE.Group();
  group.name = "exhibits";
  scene.add(group);

  // Hanging station signs.
  const signMat = (canvas) => new THREE.MeshBasicMaterial({ map: texture(canvas) });
  const rodMat = postMat;
  const hang = (canvas, d) => {
    const sign = new THREE.Group();
    const mat = signMat(canvas);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.6), mat);
    const back = front.clone();
    back.rotation.y = Math.PI;
    sign.add(front, back);
    for (const sx of [-1.1, 1.1]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), rodMat);
      rod.position.set(sx, 0.7, 0);
      sign.add(rod);
    }
    sign.position.set(0, FLOOR_Y + 3.55, zAt(d));
    group.add(sign);
  };
  hang(signCanvas("", "Kamizan Amirudin", "Senior Programmer · System Analyst · DevOps"), 6);
  for (const s of STATIONS) if (s.no) hang(signCanvas(s.no, s.name), s.d);

  // Key figures, painted on the left wall at the profile station.
  const figures = [...doc.querySelectorAll(".figures tr")].map((tr) => [
    text(tr, "td"),
    text(tr, "th"),
  ]);
  let paint = null;
  if (figures.length) {
    const paintMat = new THREE.MeshBasicMaterial({
      map: texture(paintCanvas(figures, theme)),
      transparent: true,
      depthWrite: false,
    });
    paint = new THREE.Mesh(new THREE.PlaneGeometry(12, 2), paintMat);
    paint.rotation.y = Math.PI / 2;
    paint.position.set(-TUNNEL.halfWidth + 0.03, FLOOR_Y + 1.05, zAt(70));
    group.add(paint);
  }

  const items = [];
  for (const spec of LAYOUT) {
    const el = doc.querySelector(`[data-exhibit="${spec.key}"]`);
    if (!el) continue;
    const info = describe(el);
    info.image = await loadImage(info.img);
    const station = [...STATIONS].reverse().find((s) => s.d <= spec.d);
    const kicker = spec.type === "plaque" ? info.when || station.name : station.name;
    const z = zAt(spec.d);
    let parts;
    let anchor;
    const props = [];

    if (spec.type === "door") {
      parts = archDoor(info.image, group, z);
      anchor = new THREE.Vector3(TUNNEL.halfWidth - 0.4, FLOOR_Y + 0.35, z);
    } else if (spec.type === "end") {
      const canvas = panelCanvas({ ...info, image: null }, "End of the tunnel", 1024, 640);
      parts = lightbox(canvas, 2.4, 1.5);
      parts.group.position.set(0, FLOOR_Y + 1.75, z);
      group.add(parts.group);
      addPost(group, -0.9, z - 0.05, 1.0);
      addPost(group, 0.9, z - 0.05, 1.0);
      anchor = new THREE.Vector3(0, FLOOR_Y + 0.75, z);
    } else {
      const small = spec.type === "plaque";
      const w = small ? 1.5 : 2.0;
      const h = small ? 0.96 : 1.3;
      const canvas = panelCanvas(info, kicker, 1024, Math.round((1024 * h) / w));
      parts = lightbox(canvas, w, h);
      const x = spec.side * (TUNNEL.halfWidth - 0.62);
      const cy = small ? 1.6 : 1.78;
      parts.group.position.set(x, FLOOR_Y + cy, z);
      parts.group.rotation.y = spec.side < 0 ? Math.PI / 2 - ANGLE : -Math.PI / 2 + ANGLE;
      group.add(parts.group);
      addPost(group, x, z, cy - h / 2);
      anchor = new THREE.Vector3(x, FLOOR_Y + cy - h / 2 - 0.18, z);
      if (spec.prop) {
        const prop = buildProp(spec.prop);
        prop.position.set(spec.side * (TUNNEL.halfWidth - 0.75), FLOOR_Y, z + 1.35);
        prop.rotation.y = spec.side * -0.5;
        group.add(prop);
        props.push(prop);
      }
    }
    const index = items.length;
    parts.face.userData.exhibit = index;
    for (const p of props) p.traverse((o) => (o.userData.exhibit = index));
    items.push({
      ...spec,
      el,
      info,
      label: spec.type === "end" ? "Get in touch" : `${spec.action} ${info.title}`,
      faceMat: parts.faceMat,
      face: parts.face,
      props,
      anchor,
      lift: 0,
    });
  }

  function setTheme(name) {
    if (paint) {
      paint.material.map.dispose();
      paint.material.map = texture(paintCanvas(figures, name));
      paint.material.needsUpdate = true;
    }
    frameMat.color.set(name === "night" ? "#d9d3c7" : "#f3eee4");
  }

  const targets = items.flatMap((it) => [it.face, ...it.props]);
  return { group, items, targets, setTheme };
}

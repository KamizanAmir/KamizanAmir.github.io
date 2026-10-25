// The System: holographic windows that hang in front of the visitor's eyes
// while they fall, three per stop (the record ahead, details to the left,
// data to the right). Real DOM placed in 3D by CSS3DRenderer and built from
// the page view's own content, so the text stays sharp, links and the message
// form work, and screen readers read it like the page.
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/addons/CSS3DRenderer.js";

// The System changes colour with each section, so every dive reads as a new mode.
export const HUES = {
  intro: "#5ad7ff",
  gov: "#4fb3ff",
  personal: "#a98bff",
  arena: "#5ef0a4",
  profile: "#ffc15e",
  career: "#ff7eb6",
  toolkit: "#46e0d2",
  contact: "#ff9b5e",
};

const DIST = 1.8; // metres from the eye
const LIFT = 0.12; // radians above the gaze, so your legs stay in view below
const GAP = 28; // css px between windows

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clean = (s) => s.replace(/\s+/g, " ").trim();
const all = (root, sel) => [...root.querySelectorAll(sel)];

function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt) n.textContent = txt;
  return n;
}

function textOf(root, sel) {
  const n = root.querySelector(sel);
  return n ? clean(n.textContent) : "";
}

function link(a) {
  const c = a.cloneNode(true);
  c.removeAttribute("id");
  c.className = "holo-link";
  return c;
}

// A cell's content without its <small> note, keeping lang and abbr markup.
function main(cell) {
  const c = cell.cloneNode(true);
  c.querySelectorAll("small").forEach((s) => s.remove());
  c.normalize();
  return [...c.childNodes];
}

function note(cell) {
  const s = cell && cell.querySelector("small");
  return s ? clean(s.textContent) : "";
}

function bar(tag, count) {
  const h = el("header", "holo-bar");
  h.append(el("span", "holo-tag", `[ ${tag} ]`));
  if (count) h.append(el("span", "holo-count", count));
  return h;
}

// [[label, text or nodes, small note]]
function rows(list) {
  const dl = el("dl", "holo-rows");
  for (const [k, v, small] of list) {
    if (!v || (Array.isArray(v) && !v.length)) continue;
    const d = el("div");
    const dt = el("dt");
    if (Array.isArray(k)) dt.append(...k);
    else dt.textContent = k;
    const dd = el("dd");
    if (typeof v === "string") dd.textContent = v;
    else if (Array.isArray(v)) dd.append(...v);
    else dd.append(v);
    if (small) dd.append(el("small", "", small));
    d.append(dt, dd);
    dl.append(d);
  }
  return dl;
}

function chips(list, label) {
  const ul = el("ul", "holo-chips");
  ul.setAttribute("aria-label", label);
  for (const t of list) ul.append(el("li", "", t));
  return ul;
}

function paras(nodes) {
  return nodes.map((p) => el("p", "holo-text", clean(p.textContent))).filter((p) => p.textContent);
}

function tableRows(table) {
  return all(table, "tbody tr").map((tr) => {
    const th = tr.querySelector("th");
    const td = tr.querySelector("td");
    return [main(th), main(td), note(td) || note(th)];
  });
}

function kind(stop) {
  if (!stop.section) return "intro";
  if (stop.el.matches(".job")) return "job";
  if (stop.el.matches("li, article")) return "project";
  return stop.key;
}

function ding(stop) {
  const k = kind(stop);
  if (k === "intro") return "Ding! System bound to host.";
  if (k === "contact") return "Ding! Final stop reached.";
  if (k === "job" || k === "earlier") return "Ding! Career record unlocked.";
  if (k === "project") return "Ding! Project record unlocked.";
  return "Ding! New record unlocked.";
}

export function createHolo(root, { stops, doc, coarse, reduce, onDive }) {
  const layer = root.querySelector("#holo-layer");
  const renderer = new CSS3DRenderer({ element: layer });
  const scene = new THREE.Scene();
  const total = stops.length - 1;

  // DOM order is reading order: the record, then details, then data.
  const panes = [
    { slot: "center", k: 0 },
    { slot: "left", k: -1 },
    { slot: "right", k: 1 },
  ].map((p) => {
    const node = el("section", `holo holo-${p.slot}`);
    node.setAttribute("aria-labelledby", `holo-${p.slot}-title`);
    const inner = el("div", "holo-in");
    node.append(inner);
    const obj = new CSS3DObject(node);
    obj.visible = false;
    scene.add(obj);
    node.addEventListener("focusin", () => (focusK = p.k));
    node.addEventListener("focusout", () => (focusK = null));
    return { ...p, node, inner, obj };
  });

  // Focusing a link inside a 3D window can make the browser scroll the
  // layer to it; the layer must never scroll, the windows move instead.
  layer.addEventListener("scroll", () => {
    layer.scrollTop = 0;
    layer.scrollLeft = 0;
  });

  let open = false;
  let current = 0;
  let paneW = 420;
  let lent = null; // { node, home } while the message form is in a window
  let typing = 0;
  let shutTimer = 0;
  let needsAnchor = true;
  let focusK = null;
  let yaw = 0; // the frame's heading, trailing the eye
  let pitch = 0;
  let rest = 0; // the heading the windows were hung at
  const anchor = new THREE.Vector2();

  // ---------- content ----------
  function controls() {
    const list = coarse
      ? [
          ["Left stick", "Drift around the well"],
          ["Drag or swipe", "Look around, and turn to these windows"],
          ["Arrow button", "Dive to the next stop"],
          ["Tap a window", "Your hand presses it"],
        ]
      : [
          ["WASD or arrows", "Drift around the well"],
          ["Mouse", "Look around, and turn to these windows"],
          ["Space or scroll", "Dive to the next stop"],
          ["PageUp", "Back up one stop"],
          ["Click a window", "Your hand presses it"],
        ];
    return rows(list);
  }

  function buildCenter(stop, i) {
    const { info } = stop;
    const f = document.createDocumentFragment();
    f.append(bar("System", stop.section ? `${String(i).padStart(2, "0")} / ${total}` : `${total} stops`));
    const d = el("p", "holo-ding");
    const typed = el("span", "holo-typed");
    typed.setAttribute("aria-hidden", "true");
    d.append(typed, el("span", "sr-only", ding(stop)));
    f.append(d);

    const id = el("div", "holo-id");
    if (kind(stop) === "project" && info.img) {
      const img = el("img", "holo-emblem");
      img.src = info.img;
      img.alt = "";
      img.width = img.height = 52;
      id.append(img);
    }
    const names = el("div");
    if (stop.section) names.append(el("p", "holo-kicker", `${stop.section.no} ${stop.section.name}`));
    const h = el("h2", "holo-title", info.title);
    h.id = "holo-center-title";
    const sub = el("p", "holo-sub", info.sub);
    if (info.subLang) sub.lang = info.subLang;
    names.append(h, sub);
    id.append(names);
    f.append(id);

    if (stop.key === "arena" && info.shot) {
      const shot = el("img", "holo-shot");
      shot.src = info.shot;
      shot.alt = info.shotAlt;
      f.append(shot);
    }
    if (info.when) f.append(el("p", "holo-when", info.when));
    let text = stop.desc;
    if (!stop.section) text = `Task: fall through ${total} stops of work. Dive when you're ready for the next one.`;
    if (i === total) text = `${text ? text + " " : ""}This is the last stop. Below it is the bottom of the well.`;
    if (text) f.append(el("p", "holo-text", text));

    const guide = el("p", "holo-guide");
    const l = el("span", "", "←");
    const r = el("span", "", "→");
    l.setAttribute("aria-hidden", "true");
    r.setAttribute("aria-hidden", "true");
    guide.append(l, el("span", "", coarse ? "Swipe or drift: details left, data right" : "Look or drift: details left, data right"), r);
    f.append(guide);

    const btn = el("button", "holo-dive");
    btn.type = "button";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15M5.5 12.5 12 19l6.5-6.5" /></svg>';
    btn.append(el("span", "", i === total ? "Let go" : "Dive"), el("kbd", "", "Space"));
    btn.setAttribute("aria-label", i === total ? "Let go and fall to the bottom" : "Dive to the next stop");
    // detail is 0 for Enter or Space on the button, which had no pointer press.
    btn.addEventListener("click", (e) => onDive(e.detail > 0));
    const foot = el("footer", "holo-foot");
    foot.append(btn);
    f.append(foot);
    return f;
  }

  function buildLeft(stop) {
    const src = stop.el;
    const f = document.createDocumentFragment();
    f.append(bar(stop.section ? "Details" : "Guide"));
    const h = el("h3", "holo-title", stop.section ? stop.info.title : "How to fall");
    h.id = "holo-left-title";
    f.append(h);
    switch (kind(stop)) {
      case "intro":
        f.append(controls());
        break;
      case "project":
        f.append(...paras(all(src, ".reg-desc")));
        if (src.querySelector(".reg-meta span") && /private/i.test(textOf(src, ".reg-meta"))) {
          f.append(el("p", "holo-note", "Private repository, so there is no public source link."));
        }
        break;
      case "job":
        f.append(...paras(all(src, ".job-body > p:not(.job-org):not(.job-tools)")));
        break;
      case "arena":
        f.append(...paras(all(src, ".arena-copy > p:not(.arena-facts)")));
        break;
      case "profile": {
        f.append(...paras(all(src, ".story p")));
        const now = src.querySelector(".now p:not(.now-label)");
        if (now) f.append(rows([["Currently", clean(now.textContent)]]));
        break;
      }
      case "earlier":
        f.append(rows(all(src, ".earlier li").map((li) => [textOf(li, ".when"), clean(li.lastElementChild.textContent)])));
        break;
      case "toolkit": {
        const table = src.querySelector(".spec");
        if (table) f.append(rows(tableRows(table)));
        break;
      }
      case "education": {
        const table = src.querySelector(".spec");
        if (table) f.append(rows(tableRows(table)));
        break;
      }
      case "contact": {
        f.append(...paras(all(src, ".contact-copy > p")));
        f.append(
          rows(
            all(src, ".channels > div").map((d) => {
              const a = d.querySelector("dd a");
              return [textOf(d, "dt"), a ? link(a) : textOf(d, "dd")];
            }),
          ),
        );
        break;
      }
    }
    return f;
  }

  function buildRight(stop) {
    const src = stop.el;
    const { info } = stop;
    const f = document.createDocumentFragment();
    f.append(bar("Data"));
    const h = el("h3", "holo-title", "Record");
    h.id = "holo-right-title";
    f.append(h);
    const tags = info.tags ? info.tags.split(/,\s*/) : [];
    switch (kind(stop)) {
      case "intro": {
        h.textContent = info.title;
        f.append(rows(all(doc, ".sheet dl > div").map((d) => [textOf(d, "dt"), textOf(d, "dd")])));
        break;
      }
      case "project": {
        const links = all(src, "a[href]").map(link);
        f.append(
          rows([
            ["Name", info.sub],
            ["Repository", links.length ? "" : /private/i.test(textOf(src, ".reg-meta")) ? "Private" : ""],
          ]),
        );
        if (tags.length) f.append(chips(tags, "Built with"));
        if (links.length) {
          const row = el("div", "holo-actions");
          row.append(...links);
          f.append(row);
        }
        break;
      }
      case "job": {
        const [when, where] = all(src, ".job-when span").map((s) => clean(s.textContent));
        f.append(
          rows([
            ["Role", info.title],
            ["Company", info.sub],
            ["Period", when],
            ["Location", where],
          ]),
        );
        if (tags.length) f.append(chips(tags, "Tools"));
        break;
      }
      case "arena": {
        if (tags.length) f.append(chips(tags, "Facts"));
        const play = src.querySelector(".arena-copy a[href]");
        if (play) {
          const row = el("div", "holo-actions");
          row.append(link(play));
          f.append(row);
        }
        break;
      }
      case "profile": {
        h.textContent = "Stats";
        const dl = el("dl", "holo-stats");
        for (const tr of all(src, ".figures tr")) {
          const d = el("div");
          d.append(el("dt", "", textOf(tr, "th")), el("dd", "", textOf(tr, "td")));
          dl.append(d);
        }
        f.append(dl);
        if (tags.length) f.append(chips(tags, "Industries"));
        break;
      }
      case "toolkit": {
        h.textContent = "Ready to be tested on";
        const strong = all(src, ".spec td strong").map((s) => clean(s.textContent));
        if (strong.length) f.append(chips(strong, "Strongest tools"));
        const key = src.querySelector(".toolkit-key");
        if (key) f.append(el("p", "holo-note", clean(key.textContent)));
        break;
      }
      case "education": {
        h.textContent = "Languages";
        const tables = all(src, ".spec");
        if (tables[1]) f.append(rows(tableRows(tables[1])));
        break;
      }
      case "contact": {
        h.textContent = "Send a message";
        // Lend the real form so it submits exactly as on the page.
        const form = src.querySelector("form");
        if (form) {
          const home = document.createComment("contact-form");
          form.replaceWith(home);
          lent = { node: form, home };
          f.append(form);
        }
        break;
      }
      default:
        if (tags.length) f.append(chips(tags, "Tags"));
    }
    return f;
  }

  function giveBack() {
    if (lent) {
      lent.home.replaceWith(lent.node);
      lent = null;
    }
  }

  function type(node, str) {
    clearInterval(typing);
    if (reduce()) {
      node.textContent = str;
      return;
    }
    let n = 0;
    node.textContent = "";
    typing = setInterval(() => {
      node.textContent = str.slice(0, ++n);
      if (n >= str.length) clearInterval(typing);
    }, 28);
  }

  // ---------- open and shut ----------
  function show(i) {
    clearTimeout(shutTimer);
    giveBack();
    current = i;
    const stop = stops[i];
    root.style.setProperty("--holo", HUES[stop.section ? stop.section.id : "intro"]);
    const build = { center: buildCenter, left: buildLeft, right: buildRight };
    for (const p of panes) {
      p.inner.replaceChildren(build[p.slot](stop, i));
      p.inner.scrollTop = 0;
      p.node.classList.remove("is-out");
      // Restart the boot-up animation for the new record.
      p.node.classList.remove("is-in");
      void p.node.offsetWidth;
      p.node.classList.add("is-in");
      p.obj.visible = true;
    }
    type(panes[0].inner.querySelector(".holo-typed"), ding(stop));
    needsAnchor = true;
    open = true;
  }

  function shut() {
    if (!open) return;
    open = false;
    clearInterval(typing);
    for (const p of panes) p.node.classList.add("is-out");
    shutTimer = setTimeout(
      () => {
        for (const p of panes) p.obj.visible = false;
        giveBack();
      },
      reduce() ? 0 : 200,
    );
  }

  // ---------- placement ----------
  const fwd = new THREE.Vector3();
  const local = new THREE.Vector3();
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  const frame = new THREE.Quaternion();
  const turn = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  let viewH = 1;

  function layout(w, h) {
    viewH = h;
    renderer.setSize(w, h);
    paneW = Math.round(Math.min(coarse ? 400 : 420, w - 32));
    const maxH = Math.round(Math.min(h * 0.62, h - 150));
    for (const p of panes) {
      p.node.style.width = `${paneW}px`;
      p.inner.style.maxHeight = `${maxH}px`;
    }
  }

  // The windows ride a frame that trails your eye, upright, with no roll, so
  // the System stays in front of you wherever you look. Turning your head or
  // drifting slides them the other way, as if they hung still, which is how
  // a side window comes in front; go past it and they come along with you.
  function update(dt, camera) {
    if (open || panes.some((p) => p.obj.visible)) {
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const scale = (2 * DIST * tanV) / viewH; // 1 css px reads as 1 screen px
      const spacing = (paneW + GAP) * scale;
      camera.getWorldDirection(fwd);
      const gYaw = Math.atan2(-fwd.x, -fwd.z);
      const gPitch = Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1));
      const eye = camera.position;
      const snap = reduce();
      if (needsAnchor) {
        yaw = gYaw;
        pitch = gPitch;
        rest = gYaw;
        anchor.set(eye.x, eye.z);
        needsAnchor = false;
      }
      yaw = snap ? gYaw : yaw + wrapAngle(gYaw - yaw) * (1 - Math.exp(-10 * dt));
      pitch = snap ? gPitch : damp(pitch, gPitch, 6, dt);

      // How far the windows have slid: head turned since they opened, minus
      // how far you've drifted to the side.
      const lat = (eye.x - anchor.x) * Math.cos(yaw) - (eye.z - anchor.y) * Math.sin(yaw);
      let off = DIST * wrapAngle(yaw - rest) - lat;
      if (focusK !== null) {
        // Keyboard focus in a side window slides that window in front of you.
        const want = -focusK * spacing;
        off = snap ? want : off + (want - off) * (1 - Math.exp(-8 * dt));
        rest = yaw - (off + lat) / DIST;
      }
      const limit = spacing * 1.25;
      if (Math.abs(off) > limit) {
        const excess = off - Math.sign(off) * limit;
        rest += excess / DIST;
        off -= excess;
      }

      // On a short screen (a phone on its side) there's no room to lift them.
      euler.set(pitch + (viewH < 520 ? 0 : LIFT), yaw, 0);
      frame.setFromEuler(euler);
      let near = null;
      let best = Infinity;
      for (const p of panes) {
        const x = p.k * spacing + off;
        local.set(x, 0, -DIST).applyQuaternion(frame);
        p.obj.position.copy(eye).add(local);
        // Each window turns to face the eye, which curves the row around you.
        p.obj.quaternion.copy(frame).multiply(turn.setFromAxisAngle(UP, -Math.atan2(x, DIST)));
        p.obj.scale.setScalar(scale);
        if (Math.abs(x) < best) {
          best = Math.abs(x);
          near = p;
        }
      }
      for (const p of panes) p.node.classList.toggle("is-near", p === near);
    }
    renderer.render(scene, camera);
  }

  // ---------- presses ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane();
  const normal = new THREE.Vector3();
  const hit = new THREE.Vector3();

  function paneOf(target) {
    return panes.find((p) => p.node.contains(target)) || null;
  }

  // A ring spreads from where the window was pressed.
  function ripple(target, x, y, camera) {
    const p = paneOf(target);
    if (!p) return;
    const r = layer.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    normal.set(0, 0, 1).applyQuaternion(p.obj.quaternion);
    plane.setFromNormalAndCoplanarPoint(normal, p.obj.position);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    p.obj.worldToLocal(hit);
    const ring = el("span", "holo-ripple");
    ring.style.left = `${(hit.x + p.node.offsetWidth / 2).toFixed(1)}px`;
    ring.style.top = `${(p.node.offsetHeight / 2 - hit.y).toFixed(1)}px`;
    p.node.append(ring);
    setTimeout(() => ring.remove(), 650);
  }

  // Where the hand should press to dive: the window's own Dive button, if it's in view.
  function diveSpot() {
    if (!open) return null;
    const b = panes[0].inner.querySelector(".holo-dive");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight || !r.width) return null;
    return { x, y, el: b };
  }

  // Wheel over a window that can scroll is reading, not diving.
  function scrolls(target, dy) {
    const p = paneOf(target);
    if (!p) return false;
    const s = p.inner;
    return dy > 0 ? s.scrollTop + s.clientHeight < s.scrollHeight - 1 : s.scrollTop > 0;
  }

  return {
    show,
    shut,
    layout,
    update,
    ripple,
    diveSpot,
    scrolls,
    paneOf,
    get open() {
      return open;
    },
    get current() {
      return current;
    },
  };
}

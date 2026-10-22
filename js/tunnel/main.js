// The tunnel view: walk the void, fall into the hole, walk the tunnel.
import * as THREE from "three";
import {
  buildWorld,
  PALETTES,
  shared,
  HOLE,
  HOLE_R,
  EYE,
  FLOOR_Y,
  TUNNEL,
  LANDING_D,
  zAt,
} from "./world.js";
import { buildExhibits, STATIONS, D_MIN, D_MAX } from "./exhibits.js";
import { setPropTheme } from "./props.js";
import { createDialog } from "./dialog.js";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const angleTo = (dx, dz) => Math.atan2(-dx, -dz);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const WALK = 3.4; // m/s in the void
const TUNNEL_WALK = 5;
const BOUND = 48;
const FALL = { tip: 0.45, drop: 1.7, land: 0.75 };
const STAND_BEFORE = 4.5; // where a station jump stops, before its sign

export async function start({ root, doc, theme, onProgress, onError }) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(pointer: coarse)").matches;
  const canvas = root.querySelector("#gl");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    onError(new Error("WebGL context lost"));
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 220);
  camera.rotation.order = "YXZ";

  const world = buildWorld(scene);
  onProgress(0.55);
  const exhibits = await buildExhibits(scene, doc, theme);
  onProgress(0.9);

  // ---------- DOM ----------
  const ui = {
    void: root.querySelector("#void-ui"),
    walk: root.querySelector("#walk-to-light"),
    hint: root.querySelector("#void-hint"),
    tunnelHint: root.querySelector("#tunnel-hint"),
    labels: root.querySelector("#labels"),
    rail: root.querySelector("#rail"),
    stops: root.querySelector("#rail-stops"),
    now: root.querySelector("#rail-now"),
    prev: root.querySelector("#rail-prev"),
    next: root.querySelector("#rail-next"),
    flash: root.querySelector("#flash"),
    live: root.querySelector("#xp-live"),
  };

  const dialog = createDialog(root, {
    onClose(opener) {
      resume();
      const back =
        opener && opener.isConnected && !opener.hidden ? opener : ui.rail.querySelector("[aria-current]");
      (back || canvas).focus({ preventScroll: true });
    },
  });

  const labels = exhibits.items.map((item) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tag";
    b.hidden = true;
    b.textContent = item.label;
    b.addEventListener("click", () => openItem(item, b));
    ui.labels.append(b);
    return { el: b, shown: false };
  });

  const stopButtons = STATIONS.map((s, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "rail-stop";
    b.innerHTML = s.no ? `<span class="rail-no">${s.no}</span> ${s.name}` : s.name;
    b.addEventListener("click", () => goStation(i));
    li.append(b);
    ui.stops.append(li);
    return b;
  });
  ui.prev.addEventListener("click", () => goStation(S.station - 1));
  ui.next.addEventListener("click", () => goStation(S.station + 1));
  ui.walk.addEventListener("click", () => walkToHole());
  if (coarse) {
    ui.hint.textContent = "Drag to look around. Tap the light, or anywhere on the floor, to walk there.";
    ui.tunnelHint.textContent = "Swipe up to walk, sideways to look. Tap a panel to open it.";
  }

  // ---------- state ----------
  const S = {
    phase: "void",
    pos: new THREE.Vector2(0, 0),
    vel: new THREE.Vector2(),
    heading: 0,
    look: { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, touchYaw: 0, touchPitch: 0 },
    edgeSpin: 0,
    auto: null,
    autoHole: false,
    d: LANDING_D,
    dTarget: LANDING_D,
    t: 0,
    fallPitch: 0,
    fallStart: null,
    eyeDip: 0,
    stepPhase: 0,
    speed: 0,
    station: 0,
    fov: 62,
    roll: 0,
    walked: false,
  };
  const keys = new Set();
  let palette = PALETTES[theme];
  const sky = new THREE.Color(palette.sky);
  const deep = new THREE.Color(palette.tunnelFog);

  // ---------- input ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointer = { x: 0, y: 0, hoverDirty: false, down: null, axis: null };
  const holeTargets = [world.void.hit, world.void.beam, world.void.rim];

  function pick(x, y, targets) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(targets, true)[0] || null;
  }

  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      const range = S.phase === "tunnel" ? 1.05 : 0.85;
      S.look.tYaw = -nx * range;
      S.look.tPitch = -ny * 0.32;
      S.edgeSpin = Math.abs(nx) > 0.8 ? -Math.sign(nx) * ((Math.abs(nx) - 0.8) / 0.2) * 1.4 : 0;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.hoverDirty = true;
    }
    const p = pointer.down;
    if (!p || p.id !== e.pointerId || e.pointerType === "mouse") return;
    const dx = e.clientX - p.lx;
    const dy = e.clientY - p.ly;
    p.lx = e.clientX;
    p.ly = e.clientY;
    p.moved += Math.abs(dx) + Math.abs(dy);
    if (S.phase === "void") {
      S.heading += dx * 0.006;
      S.look.touchPitch = clamp(S.look.touchPitch + dy * 0.004, -0.6, 0.6);
      S.auto = null;
    } else if (S.phase === "tunnel") {
      if (!pointer.axis && p.moved > 10) {
        pointer.axis = Math.abs(e.clientX - p.x) > Math.abs(e.clientY - p.y) ? "x" : "y";
      }
      if (pointer.axis === "x") S.look.touchYaw = clamp(S.look.touchYaw + dx * 0.005, -1.1, 1.1);
      if (pointer.axis === "y") S.dTarget = clamp(S.dTarget - dy * 0.035, D_MIN, D_MAX);
    }
  });
  canvas.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") S.edgeSpin = 0;
  });
  canvas.addEventListener("pointerdown", (e) => {
    pointer.down = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0, t: performance.now() };
    pointer.axis = null;
  });
  canvas.addEventListener("pointerup", (e) => {
    const p = pointer.down;
    pointer.down = null;
    if (!p || p.moved > 10 || performance.now() - p.t > 600) return;
    tap(e.clientX, e.clientY);
  });
  canvas.addEventListener("pointercancel", () => (pointer.down = null));

  function tap(x, y) {
    if (dialog.open) return;
    if (S.phase === "void") {
      if (pick(x, y, holeTargets)) return walkToHole();
      const hit = pick(x, y, [world.void.floor]);
      if (hit && Math.hypot(hit.point.x, hit.point.z) < BOUND) {
        S.auto = new THREE.Vector2(hit.point.x, hit.point.z);
        S.autoHole = false;
      }
    } else if (S.phase === "tunnel") {
      const hit = pick(x, y, exhibits.targets);
      if (hit) {
        const i = hit.object.userData.exhibit;
        openItem(exhibits.items[i], labels[i].shown ? labels[i].el : null);
      }
    }
  }

  root.addEventListener(
    "wheel",
    (e) => {
      if (dialog.open || e.target.closest(".card")) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      if (S.phase === "tunnel") S.dTarget = clamp(S.dTarget + dy * 0.012, D_MIN, D_MAX);
      else if (S.phase === "void") {
        const step = clamp(dy * 0.01, -1.5, 1.5);
        const yaw = S.heading + S.look.yaw;
        S.pos.x -= Math.sin(yaw) * step;
        S.pos.y -= Math.cos(yaw) * step;
        S.walked = true;
      }
    },
    { passive: true },
  );

  const MOVE_KEYS = new Set(["KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  function onKeyDown(e) {
    if (!active || dialog.open || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (MOVE_KEYS.has(e.code)) {
      keys.add(e.code);
      if (e.code.startsWith("Arrow")) e.preventDefault();
      S.auto = null;
    } else if (S.phase === "tunnel" && e.code === "PageDown") {
      e.preventDefault();
      goStation(S.station + 1);
    } else if (S.phase === "tunnel" && e.code === "PageUp") {
      e.preventDefault();
      goStation(S.station - 1);
    }
  }
  const onKeyUp = (e) => keys.delete(e.code);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => keys.clear());

  // ---------- actions ----------
  function walkToHole() {
    if (S.phase !== "void") return;
    S.auto = new THREE.Vector2(HOLE.x, HOLE.z);
    S.autoHole = true;
  }

  function say(msg) {
    ui.live.textContent = "";
    requestAnimationFrame(() => (ui.live.textContent = msg));
  }

  function setFlash(v, instant) {
    ui.flash.style.transition = instant ? "none" : "";
    ui.flash.style.opacity = String(v);
  }

  function beginFall() {
    S.phase = "fall";
    S.auto = null;
    S.vel.set(0, 0);
    keys.clear();
    root.dataset.phase = "fall";
    ui.void.setAttribute("aria-hidden", "true");
    if (reduce.matches) {
      setFlash(1);
      setTimeout(() => land(), 380);
      return;
    }
    S.fallStart = { t: S.t, x: S.pos.x, z: S.pos.y, heading: S.heading };
  }

  function land() {
    S.phase = "tunnel";
    S.pos.set(HOLE.x, HOLE.z);
    S.heading = 0;
    S.fallPitch = 0;
    S.fallStart = null;
    S.d = LANDING_D;
    S.dTarget = LANDING_D + 3;
    S.look.touchYaw = 0;
    S.look.touchPitch = 0;
    root.dataset.phase = "tunnel";
    ui.rail.hidden = false;
    setFlash(0);
    updateStation(true);
    say("You fell into the tunnel. Walk forward to see the work. Use the station list to jump.");
  }

  function reset() {
    if (dialog.open) dialog.hide();
    setFlash(1);
    setTimeout(
      () => {
        S.phase = "void";
        S.pos.set(0, 0);
        S.vel.set(0, 0);
        S.heading = 0;
        S.auto = null;
        S.walked = false;
        S.fov = 62;
        S.roll = 0;
        S.eyeDip = 0;
        S.look.touchYaw = 0;
        S.look.touchPitch = 0;
        root.dataset.phase = "void";
        ui.void.removeAttribute("aria-hidden");
        ui.void.classList.remove("walking");
        ui.rail.hidden = true;
        root.classList.remove("has-walked");
        labels.forEach((l) => {
          l.el.hidden = true;
          l.shown = false;
        });
        setFlash(0);
      },
      reduce.matches ? 0 : 320,
    );
  }

  function goStation(i) {
    if (S.phase !== "tunnel") return;
    i = clamp(i, 0, STATIONS.length - 1);
    const target = clamp(STATIONS[i].d - (i ? STAND_BEFORE : 0), D_MIN, D_MAX);
    if (reduce.matches) {
      setFlash(1);
      setTimeout(() => {
        S.d = S.dTarget = target;
        setFlash(0);
      }, 220);
    } else S.dTarget = target;
  }

  function openItem(item, from) {
    if (dialog.open) return;
    dialog.show(item, from);
    pause();
  }

  function updateStation(force) {
    let i = 0;
    STATIONS.forEach((s, k) => {
      if (S.d >= s.d - STAND_BEFORE - 0.5) i = k;
    });
    if (i === S.station && !force) return;
    S.station = i;
    stopButtons.forEach((b, k) => (k === i ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
    const s = STATIONS[i];
    ui.now.textContent = s.no ? `${s.no} ${s.name}` : s.name;
    ui.prev.disabled = i === 0;
    ui.next.disabled = i === STATIONS.length - 1;
    if (!force) say(`Station ${s.no || ""} ${s.name}`.replace(/\s+/g, " "));
  }

  // ---------- frame ----------
  const fwd = new THREE.Vector2();
  const proj = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  const dim = new THREE.Color("#e2ddd4");
  const lit = new THREE.Color("#ffffff");

  function updateVoid(dt) {
    const L = S.look;
    if (!coarse) S.heading += S.edgeSpin * dt;
    let turn = 0;
    if (keys.has("ArrowLeft")) turn += 1;
    if (keys.has("ArrowRight")) turn -= 1;
    S.heading += turn * 1.8 * dt;

    const yaw = S.heading + L.yaw;
    fwd.set(-Math.sin(yaw), -Math.cos(yaw));
    let f = 0;
    let s = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) f += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) f -= 1;
    if (keys.has("KeyD")) s += 1;
    if (keys.has("KeyA")) s -= 1;
    const want = new THREE.Vector2(fwd.x * f - fwd.y * s, fwd.y * f + fwd.x * s);
    if (want.lengthSq() > 1) want.normalize();
    want.multiplyScalar(WALK);

    if (S.auto) {
      const dx = S.auto.x - S.pos.x;
      const dz = S.auto.y - S.pos.y;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.15 && !S.autoHole) S.auto = null;
      else {
        const sp = S.autoHole ? WALK : Math.min(WALK, dist * 2.2 + 0.4);
        want.set((dx / dist) * sp, (dz / dist) * sp);
        const target = angleTo(dx, dz) - L.yaw;
        S.heading += wrapAngle(target - S.heading) * (1 - Math.exp(-3 * dt));
      }
    }

    S.vel.x = damp(S.vel.x, want.x, 6, dt);
    S.vel.y = damp(S.vel.y, want.y, 6, dt);
    S.pos.x += S.vel.x * dt;
    S.pos.y += S.vel.y * dt;
    const r = S.pos.length();
    if (r > BOUND) S.pos.multiplyScalar(BOUND / r);
    S.speed = S.vel.length();
    if (S.speed > 0.3 && !S.walked) {
      S.walked = true;
      ui.void.classList.add("walking");
    }

    if (Math.hypot(S.pos.x - HOLE.x, S.pos.y - HOLE.z) < HOLE_R - 0.4) beginFall();

    camera.position.set(S.pos.x, EYE + bob(dt), S.pos.y);
  }

  function updateFall() {
    const F = S.fallStart;
    const t = S.t - F.t;
    const discY = FLOOR_Y + TUNNEL.height;
    let y;
    if (t < FALL.tip) {
      const u = ease(t / FALL.tip);
      S.pos.set(F.x + (HOLE.x - F.x) * u, F.z + (HOLE.z - F.z) * u);
      S.fallPitch = -1.25 * u;
      y = -0.7 * u * u;
      S.fov = 62;
    } else if (t < FALL.tip + FALL.drop) {
      const u = (t - FALL.tip) / FALL.drop;
      const e = ease(u);
      S.pos.set(HOLE.x, HOLE.z);
      y = -0.7 + (FLOOR_Y + 0.7) * e;
      S.fallPitch = -1.25 - 0.2 * Math.sin(u * Math.PI);
      S.fov = 62 + 20 * Math.sin(u * Math.PI);
      S.roll = Math.sin(u * Math.PI * 3) * 0.06;
    } else if (t < FALL.tip + FALL.drop + FALL.land) {
      const u = (t - FALL.tip - FALL.drop) / FALL.land;
      y = FLOOR_Y;
      S.eyeDip = -0.5 * Math.sin(Math.PI * Math.min(u * 1.6, 1));
      S.fallPitch = -1.25 * (1 - easeOut(u));
      S.heading = F.heading + wrapAngle(0 - F.heading) * easeOut(u);
      S.fov = 62;
      S.roll = 0;
    } else {
      S.eyeDip = 0;
      land();
      return;
    }
    const eye = y + EYE + S.eyeDip;
    const flash = Math.exp(-Math.pow((eye - discY) / 3, 2));
    setFlash(Math.min(1, flash * 1.1), true);
    camera.position.set(S.pos.x, eye, S.pos.y);
  }

  function updateTunnel(dt) {
    let f = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) f += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) f -= 1;
    if (f) S.dTarget = clamp(S.dTarget + f * TUNNEL_WALK * dt, D_MIN, D_MAX);
    let turn = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) turn += 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) turn -= 1;
    if (turn) S.look.touchYaw = clamp(S.look.touchYaw + turn * 1.5 * dt, -1.1, 1.1);

    const prev = S.d;
    const step = (S.dTarget - S.d) * (1 - Math.exp(-5 * dt));
    S.d += clamp(step, -32 * dt, 32 * dt);
    S.speed = Math.abs(S.d - prev) / Math.max(dt, 1e-4);
    S.pos.x = damp(S.pos.x, 0, 2, dt);
    const z = zAt(S.d);
    S.pos.y = z;
    camera.position.set(S.pos.x, FLOOR_Y + EYE + bob(dt), z);
    if (S.d > LANDING_D + 8) root.classList.add("has-walked");
    updateStation(false);
    updateExhibits(dt);
  }

  function bob(dt) {
    if (reduce.matches) return 0;
    S.stepPhase += S.speed * dt * (Math.PI / 0.75);
    const amp = 0.035 * Math.min(S.speed / 3, 1) * (1 - clamp((S.speed - 6) / 4, 0, 1));
    return -Math.abs(Math.sin(S.stepPhase)) * amp;
  }

  function updateExhibits(dt) {
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    let nearest = -1;
    let nearestRel = Infinity;
    exhibits.items.forEach((item, i) => {
      const rel = item.d - S.d;
      const L = labels[i];
      let show = rel > -1.2 && rel < (item.type === "end" ? 13 : 10);
      if (show) {
        proj.copy(item.anchor).project(camera);
        show = proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05;
      }
      if (show !== L.shown) {
        L.shown = show;
        L.el.hidden = !show;
      }
      if (show) {
        // Keep the whole label on screen, even when its panel is at the edge.
        if (!L.half) L.half = L.el.offsetWidth / 2;
        const x = clamp(((proj.x + 1) / 2) * w, L.half + 12, w - L.half - 12);
        const y = clamp(((1 - proj.y) / 2) * h, 90, h - 110);
        L.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        L.el.style.opacity = String(clamp(((item.type === "end" ? 13 : 10) - rel) / 3, 0, 1));
        if (rel > -0.6 && rel < 6.5 && rel < nearestRel) {
          nearest = i;
          nearestRel = rel;
        }
      }
    });
    exhibits.items.forEach((item, i) => {
      const on = i === nearest;
      tmpColor.copy(on ? lit : dim);
      item.faceMat.color.lerp(tmpColor, 1 - Math.exp(-6 * dt));
      item.lift = damp(item.lift, on ? 0.08 : 0, 5, dt);
      for (const p of item.props) {
        const o = p.userData.object;
        o.position.y = 0.72 + item.lift;
        if (!reduce.matches) o.rotation.y += dt * (on ? 1.1 : 0.2);
      }
    });
  }

  function updateLook(dt) {
    const L = S.look;
    const k = 5;
    if (coarse) {
      L.yaw = damp(L.yaw, L.touchYaw, 10, dt);
      L.pitch = damp(L.pitch, L.touchPitch, 10, dt);
    } else {
      L.yaw = damp(L.yaw, L.tYaw + L.touchYaw, k, dt);
      L.pitch = damp(L.pitch, L.tPitch, k, dt);
    }
    camera.rotation.set(L.pitch + S.fallPitch, S.heading + L.yaw, S.roll);
    const fov = S.fov * (camera.aspect < 0.8 ? 1.18 : 1);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  function updateAtmosphere() {
    const y = camera.position.y;
    const k = clamp((-y - 20) / 25, 0, 1);
    scene.background.copy(sky).lerp(deep, k);
    shared.uFogColor.value.copy(scene.background);
    shared.uFogNear.value = 14 - 4 * k;
    shared.uFogFar.value = 70 - 15 * k;
    world.void.group.visible = y > FLOOR_Y + 30;
    world.tunnel.group.visible = exhibits.group.visible = y < -18;
  }

  function updateHover() {
    if (!pointer.hoverDirty || coarse) return;
    pointer.hoverDirty = false;
    let hot = false;
    if (S.phase === "void") hot = !!pick(pointer.x, pointer.y, holeTargets);
    else if (S.phase === "tunnel") hot = !!pick(pointer.x, pointer.y, exhibits.targets);
    canvas.style.cursor = hot ? "pointer" : "";
  }

  function updateDust(dt) {
    const dust = world.void.dust;
    if (!dust.parent.visible || reduce.matches) return;
    const a = dust.geometry.attributes.position;
    const sp = dust.userData.speed;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) + sp[i] * dt;
      if (y > (i < dust.userData.beamCount ? 9.5 : 5)) y = 0;
      a.setY(i, y);
    }
    a.needsUpdate = true;
  }

  let last = performance.now();
  let active = true;
  let firstFrame = true;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    S.t += dt;
    shared.uTime.value = S.t;
    if (S.phase === "void") updateVoid(dt);
    else if (S.phase === "fall") {
      if (S.fallStart) updateFall();
    } else updateTunnel(dt);
    updateLook(dt);
    updateAtmosphere();
    updateHover();
    updateDust(dt);
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      onProgress(1);
    }
  }

  function resize() {
    const w = root.clientWidth;
    const h = root.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = S.fov * (camera.aspect < 0.8 ? 1.18 : 1);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function pause() {
    renderer.setAnimationLoop(null);
  }
  function resume() {
    if (!active) return;
    last = performance.now();
    renderer.setAnimationLoop(frame);
  }

  function setTheme(name) {
    palette = PALETTES[name];
    sky.set(palette.sky);
    deep.set(palette.tunnelFog);
    world.setTheme(name);
    exhibits.setTheme(name);
    setPropTheme(name);
    if (!active) renderer.render(scene, camera);
  }

  setTheme(theme);
  updateStation(true);
  ui.rail.hidden = true;
  root.dataset.phase = "void";
  resume();

  return {
    setTheme,
    reset,
    pause() {
      active = false;
      keys.clear();
      pause();
    },
    resume() {
      active = true;
      resize();
      if (!dialog.open) resume();
    },
  };
}

// The tunnel view: walk the void, step into the light, and fall the well.
// The fall never lands on its own. Each dive drops to the next stop; diving
// past the last one finds the bottom.
import * as THREE from "three";
import { buildWorld, PALETTES, shared, HOLE, HOLE_R, EYE, WELL } from "./world.js";
import { buildStops, SECTIONS } from "./exhibits.js";
import { setPropTheme } from "./props.js";
import { buildBody } from "./body.js";
import { createHud } from "./hud.js";
import { createJoystick } from "./joystick.js";
import { createHolo } from "./holo.js";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const angleTo = (dx, dz) => Math.atan2(-dx, -dz);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const WALK = 3.4; // m/s in the void
const BOUND = 48;
const DRIFT = 2.6; // sideways speed inside the well
const CRUISE = 11; // free-fall speed between stops, m/s
const DIVE = 85; // top speed of a dive
const DIVE_T = 1.25; // seconds for a one-stop dive
const END_T = 1.75; // the last dive, to the bottom
const FALL_PITCH = -1.0; // looking down past your own shoes into the well
const PROP_AHEAD = 1.6;
const PROP_BELOW = 3;
const GATE_AT = 0.72; // how far through a dive the stop's ring goes past
// Hitting the bottom, in seconds: knees fold, head hits the floor, all still.
const CRASH = { fold: 0.12, hit: 0.55, still: 1.6 };

// Well radius at a height, following the throat's flare (see world.js).
function radiusAt(y) {
  if (y > -2.5) return HOLE_R;
  if (y > -8) return HOLE_R + (WELL.r - HOLE_R) * smooth(-2.5, -8, y);
  return WELL.r;
}

// A dive's speed over time, with the distance covered precomputed so the
// stop's ring, the incoming object and the bottom can be placed ahead of time.
function diveProfile(T, toBottom) {
  const v = toBottom
    ? (u) => CRUISE + (DIVE * 1.15 - CRUISE) * smooth(0, 0.55, u)
    : (u) => CRUISE + (DIVE - CRUISE) * Math.pow(Math.sin(Math.PI * u), 1.6);
  const N = 160;
  const dist = new Float32Array(N + 1);
  const extra = new Float32Array(N + 1);
  for (let i = 1; i <= N; i++) {
    const vm = v((i - 0.5) / N);
    dist[i] = dist[i - 1] + (vm * T) / N;
    extra[i] = extra[i - 1] + ((vm - CRUISE) * T) / N;
  }
  const at = (arr, u) => {
    const x = clamp(u, 0, 1) * N;
    const i = Math.min(Math.floor(x), N - 1);
    return arr[i] + (arr[i + 1] - arr[i]) * (x - i);
  };
  return {
    v,
    dist: (u) => at(dist, u),
    extra: (u) => at(extra, u),
    total: dist[N],
    totalExtra: extra[N],
  };
}

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

  // The hands draw in their own transparent layer above the System's windows,
  // so a pressing finger lands on the glass instead of behind it.
  const handCanvas = root.querySelector("#gl-hands");
  const handRenderer = new THREE.WebGLRenderer({ canvas: handCanvas, antialias: true, alpha: true });
  handRenderer.setPixelRatio(renderer.getPixelRatio());
  handRenderer.outputColorSpace = THREE.SRGBColorSpace;
  handRenderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 220);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const world = buildWorld(scene);
  const handScene = new THREE.Scene();
  const handCam = new THREE.PerspectiveCamera(62, 1, 0.02, 10);
  handScene.add(handCam);
  const handLight = {
    hemi: new THREE.HemisphereLight(),
    sun: new THREE.DirectionalLight(),
    up: new THREE.PointLight(0xffbf5e, 0, 14, 1.2),
    glow: new THREE.PointLight(0xffbf5e, 0, 14, 1.6),
  };
  handScene.add(...Object.values(handLight));
  const body = buildBody(scene, handCam);
  onProgress(0.55);
  const stops = buildStops(scene, doc);
  const last = stops.length - 1;
  onProgress(0.9);

  // ---------- DOM ----------
  const ui = {
    void: root.querySelector("#void-ui"),
    walk: root.querySelector("#walk-to-light"),
    hint: root.querySelector("#void-hint"),
    flash: root.querySelector("#flash"),
    live: root.querySelector("#xp-live"),
    stick: root.querySelector("#stick"),
  };

  const hud = createHud(root, {
    stops,
    sections: SECTIONS,
    coarse,
    reduce: () => reduce.matches,
    onDive: () => requestDive(),
    onJump: (i) => (i > S.stop ? dive(i) : climb(i)),
    onRetry: () => reset(),
  });

  const holo = createHolo(root, {
    stops,
    doc,
    coarse,
    reduce: () => reduce.matches,
    // A pointer click already pressed the button with the hand; Enter still gets a press.
    onDive: (pressed) => (pressed ? dive() : requestDive()),
  });

  let stick = null;
  if (coarse) {
    ui.stick.hidden = false;
    stick = createJoystick(ui.stick);
    ui.hint.textContent = "Left stick to walk, drag to look around. Walk into the light, or tap it.";
  }
  ui.walk.addEventListener("click", () => walkToHole());

  // ---------- state ----------
  const S = {
    phase: "void", // void | drop | well | dead
    pos: new THREE.Vector2(0, 0),
    vel: new THREE.Vector2(),
    heading: 0,
    bodyYaw: 0,
    look: { yaw: 0, pitch: 0, nx: 0, ny: 0, touchYaw: 0, touchPitch: 0 },
    edgeSpin: 0,
    auto: null,
    autoHole: false,
    t: 0,
    y: EYE, // camera height
    vy: 0, // downward speed
    drop: null,
    dive: null,
    busy: false, // a flash cut is in progress
    pressing: false, // the hand is on its way to the Dive button
    crash: null, // hitting the bottom, see updateCrash
    stop: 0,
    basePitch: 0,
    fov: 62,
    roll: 0,
    shake: 0,
    stepPhase: 0,
    speed: 0,
    walked: false,
    drifted: false,
  };
  const keys = new Set();
  let palette = PALETTES[theme];
  const sky = new THREE.Color(palette.sky);
  const deep = new THREE.Color(palette.deep);

  // ---------- input ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointer = { x: 0, y: 0, hoverDirty: false, down: null };
  const holeTargets = [world.void.hit, world.void.beam, world.void.rim];

  function pick(x, y, targets) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(targets, true)[0] || null;
  }

  // Pointers are read from the whole view, so dragging across a System window
  // still turns your head. Controls inside the windows keep their own clicks.
  const CONTROLS = "a, button, input, textarea, select, label, .stick, .gauge, .end";
  root.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      S.look.nx = nx;
      S.look.ny = ny;
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
    if (S.phase === "void" || S.phase === "well") {
      S.heading += dx * 0.006;
      S.look.touchPitch += dy * 0.004;
      S.auto = null;
    }
  });
  root.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") S.edgeSpin = 0;
  });
  root.addEventListener("pointerdown", (e) => {
    const pane = holo.paneOf(e.target);
    if (e.target.closest(CONTROLS)) {
      if (pane && S.phase === "well") pressAt(e.clientX, e.clientY, e.target);
      return;
    }
    if (e.target !== canvas && !pane) return;
    pointer.down = { id: e.pointerId, lx: e.clientX, ly: e.clientY, moved: 0, t: performance.now(), target: pane ? e.target : null };
  });
  root.addEventListener("pointerup", (e) => {
    const p = pointer.down;
    pointer.down = null;
    if (!p || p.id !== e.pointerId || p.moved > 10 || performance.now() - p.t > 600) return;
    if (p.target) {
      if (S.phase === "well") pressAt(e.clientX, e.clientY, p.target);
    } else tap(e.clientX, e.clientY);
  });
  root.addEventListener("pointercancel", () => (pointer.down = null));

  function tap(x, y) {
    if (S.phase === "void") {
      if (pick(x, y, holeTargets)) return walkToHole();
      const hit = pick(x, y, [world.void.floor]);
      if (hit && Math.hypot(hit.point.x, hit.point.z) < BOUND) {
        S.auto = new THREE.Vector2(hit.point.x, hit.point.z);
        S.autoHole = false;
      }
    }
  }

  // The hand reaches out and presses the screen point, and the window ripples.
  const tip = new THREE.Vector3();
  function pressAt(x, y, target) {
    if (reduce.matches) return;
    const r = canvas.getBoundingClientRect();
    const nx = ((x - r.left) / r.width) * 2 - 1;
    tip.set(nx, -((y - r.top) / r.height) * 2 + 1, 0.5).applyMatrix4(handCam.projectionMatrixInverse);
    body.press(nx < 0 ? -1 : 1, tip.normalize().multiplyScalar(0.5));
    if (target) holo.ripple(target, x, y, camera);
  }

  // Scrolling is how people expect to move down a page, so it dives too.
  let wheel = 0;
  let wheelQuiet = 0;
  root.addEventListener(
    "wheel",
    (e) => {
      const dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      if (holo.scrolls(e.target, dy)) return;
      if (S.phase === "void") {
        const step = clamp(dy * 0.01, -1.5, 1.5);
        const yaw = S.heading + S.look.yaw;
        S.pos.x -= Math.sin(yaw) * step;
        S.pos.y -= Math.cos(yaw) * step;
        S.walked = true;
      } else if (S.phase === "well" && !S.dive && performance.now() > wheelQuiet) {
        wheel += dy;
        if (wheel > 80) {
          wheel = 0;
          requestDive();
        } else if (wheel < -80) {
          wheel = 0;
          climb(S.stop - 1);
        }
      }
    },
    { passive: true },
  );

  const MOVE_KEYS = new Set(["KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  function onKeyDown(e) {
    if (!active || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (MOVE_KEYS.has(e.code)) {
      keys.add(e.code);
      if (e.code.startsWith("Arrow")) e.preventDefault();
      S.auto = null;
      return;
    }
    // Space still works the bar's own controls and the end screen's button.
    if (S.phase !== "well" || e.repeat || e.target.closest(".bar, #end")) return;
    if (e.code === "Space" || e.code === "PageDown") {
      e.preventDefault();
      requestDive();
    } else if (e.code === "PageUp") {
      e.preventDefault();
      climb(S.stop - 1);
    }
  }
  const onKeyUp = (e) => keys.delete(e.code);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => keys.clear());

  function moveInput() {
    let f = 0;
    let s = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) f += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) f -= 1;
    if (keys.has("KeyD")) s += 1;
    if (keys.has("KeyA")) s -= 1;
    if (stick) {
      f += stick.state.y;
      s += stick.state.x;
    }
    const len = Math.hypot(f, s);
    if (len > 1) {
      f /= len;
      s /= len;
    }
    return { f, s };
  }

  function turnInput(dt) {
    let turn = 0;
    if (keys.has("ArrowLeft")) turn += 1;
    if (keys.has("ArrowRight")) turn -= 1;
    S.heading += turn * 1.8 * dt;
    if (!coarse) S.heading += S.edgeSpin * dt;
  }

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

  function flashPulse(v) {
    setFlash(v, true);
    requestAnimationFrame(() => requestAnimationFrame(() => setFlash(0)));
  }

  function beginFall() {
    S.phase = "drop";
    S.auto = null;
    // The fall sets its own downward gaze; a look-down from the void would stack on it.
    S.look.touchPitch = 0;
    keys.clear();
    root.dataset.phase = "drop";
    ui.void.setAttribute("aria-hidden", "true");
    if (reduce.matches) {
      setFlash(1);
      setTimeout(() => {
        S.pos.set(HOLE.x, HOLE.z);
        S.y = WELL.throat - 6;
        S.vy = CRUISE;
        S.basePitch = FALL_PITCH;
        enterWell();
        setFlash(0);
      }, 380);
      return;
    }
    S.drop = { t: 0, x: S.pos.x, z: S.pos.y };
    S.vy = 0;
  }

  function enterWell() {
    S.phase = "well";
    S.drop = null;
    root.dataset.phase = "well";
    S.stop = 0;
    hud.setPhase(true);
    hud.show(0);
    holo.show(0);
    say(`You're falling down the well. ${last} stops below. Press Space or the Dive button to drop to the next one.`);
  }

  function snapObject(stop) {
    const o = stop && stop.object;
    if (!o) return;
    o.userData.p = aheadPoint(new THREE.Vector2());
    o.visible = true;
  }

  function hideObjects(except) {
    for (const s of stops) if (s.object && s.object !== except) s.object.visible = false;
  }

  // Space, scroll and the Dive buttons all send the hand to press the System's
  // own Dive button first, then the fall takes over.
  function requestDive() {
    if (S.phase !== "well" || S.dive || S.busy || S.pressing) return;
    const spot = holo.diveSpot();
    if (!spot || reduce.matches) return dive();
    S.pressing = true;
    pressAt(spot.x, spot.y, spot.el);
    setTimeout(() => {
      S.pressing = false;
      dive();
    }, 140);
  }

  function dive(target) {
    if (S.phase !== "well" || S.dive || S.busy) return;
    const from = S.stop;
    const toBottom = target === undefined && from === last;
    const to = toBottom ? from : clamp(target ?? from + 1, 0, last);
    if (!toBottom && to <= from) return;
    hud.shut();
    holo.shut();
    hud.hideHint();
    if (reduce.matches) {
      S.busy = true;
      setFlash(1);
      setTimeout(() => {
        S.busy = false;
        if (S.phase !== "well") return;
        if (toBottom) die();
        else arrive(to);
        setFlash(0);
      }, 260);
      return;
    }
    const T = toBottom ? END_T : DIVE_T + Math.min(to - from - 1, 6) * 0.12;
    const profile = diveProfile(T, toBottom);
    S.dive = { t: 0, T, from, to, toBottom, profile, y0: S.y, passed: false };
    const { gate, bottom } = world.well;
    gate.visible = !toBottom;
    gate.position.set(HOLE.x, S.y - profile.dist(GATE_AT) - 0.4, HOLE.z);
    bottom.visible = toBottom;
    // The shoes touch down as the dive ends, about 1.5 m under the eye.
    bottom.position.set(HOLE.x, S.y - profile.total - 1.5, HOLE.z);
    if (!toBottom) snapObject(stops[to]);
  }

  function arrive(to) {
    S.stop = to;
    S.dive = null;
    world.well.gate.visible = false;
    hideObjects(stops[to].object);
    if (stops[to].object && !stops[to].object.visible) snapObject(stops[to]);
    hud.show(to);
    holo.show(to);
    wheelQuiet = performance.now() + 450;
    const s = stops[to];
    say(
      s.section
        ? `Stop ${to} of ${last}: ${s.info.title}. ${s.section.name}.${to === last ? " Last stop. Dive again to reach the bottom." : ""}`
        : "Back at the entrance panel.",
    );
  }

  // Going back up is a cut, not a climb: the fall itself keeps going down.
  function climb(to) {
    if (S.phase !== "well" || S.dive || S.busy || to < 0 || to >= S.stop) return;
    S.busy = true;
    hud.shut();
    holo.shut();
    setFlash(1);
    setTimeout(
      () => {
        S.busy = false;
        if (S.phase !== "well") return;
        arrive(to);
        setFlash(0);
      },
      reduce.matches ? 0 : 240,
    );
  }

  function die() {
    S.phase = "dead";
    S.dive = null;
    root.dataset.phase = "dead";
    hud.shut();
    holo.shut();
    hud.setPhase(false);
    keys.clear();
    if (stick) stick.release();
    S.vy = 0;
    const { bottom } = world.well;
    if (!bottom.visible) {
      // A reduced-motion dive cuts straight here without placing the floor.
      bottom.position.set(HOLE.x, S.y - 1.5, HOLE.z);
      bottom.visible = true;
    }
    // The feet stand 0.13 m behind the eye. The body goes over backwards,
    // turned so it falls toward the middle of the well, not into its wall.
    const yaw0 = camera.rotation.y;
    const feet = new THREE.Vector2(S.pos.x + Math.sin(yaw0) * 0.13, S.pos.y + Math.cos(yaw0) * 0.13);
    const dx = HOLE.x - feet.x;
    const dz = HOLE.z - feet.y;
    S.crash = {
      t: 0,
      feet,
      floor: bottom.position.y,
      yaw0,
      yaw1: Math.hypot(dx, dz) > 0.6 ? Math.atan2(dx, dz) : yaw0,
      pitch0: camera.rotation.x,
      splat: false,
    };
    if (reduce.matches) {
      S.crash.t = CRASH.still;
      S.crash.splat = true;
      hud.showEnd();
    } else {
      S.shake = 1;
      flashPulse(0.35);
    }
  }

  function reset() {
    setFlash(1);
    setTimeout(
      () => {
        hud.hideEnd();
        hud.shut();
        holo.shut();
        hud.setPhase(false);
        hud.resetHint();
        S.phase = "void";
        S.pos.set(0, 0);
        S.vel.set(0, 0);
        S.heading = 0;
        S.bodyYaw = 0;
        S.auto = null;
        S.walked = false;
        S.drifted = false;
        S.y = EYE;
        S.vy = 0;
        S.drop = null;
        S.dive = null;
        S.busy = false;
        S.pressing = false;
        S.stop = 0;
        S.fov = 62;
        S.roll = 0;
        S.basePitch = 0;
        S.shake = 0;
        S.crash = null;
        S.look.touchYaw = 0;
        S.look.touchPitch = 0;
        hideObjects(null);
        world.well.gate.visible = false;
        world.well.bottom.visible = false;
        root.dataset.phase = "void";
        ui.void.removeAttribute("aria-hidden");
        ui.void.classList.remove("walking");
        setFlash(0);
        resume();
        // Wait a frame: the walk button is still hidden until the void's styles apply.
        if (root.contains(document.activeElement) || document.activeElement === document.body) {
          requestAnimationFrame(() => ui.walk.focus({ preventScroll: true }));
        }
      },
      reduce.matches ? 0 : 320,
    );
  }

  // ---------- frame ----------
  const want = new THREE.Vector2();
  const drift = { x: 0, z: 0 };

  function updateVoid(dt) {
    turnInput(dt);
    const yaw = S.heading + S.look.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const { f, s } = moveInput();
    want.set(fx * f - fz * s, fz * f + fx * s).multiplyScalar(WALK);
    if (f || s) S.auto = null;

    if (S.auto) {
      const dx = S.auto.x - S.pos.x;
      const dz = S.auto.y - S.pos.y;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.15 && !S.autoHole) S.auto = null;
      else {
        const sp = S.autoHole ? WALK : Math.min(WALK, dist * 2.2 + 0.4);
        want.set((dx / dist) * sp, (dz / dist) * sp);
        const target = angleTo(dx, dz) - S.look.yaw;
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

  function updateDrop(dt) {
    const D = S.drop;
    D.t += dt;
    const t = D.t;
    // Momentum carries you over the lip, then the throat funnels you to its middle.
    const u = easeOut(clamp(t / 0.9, 0, 1));
    S.pos.set(D.x + (HOLE.x - D.x) * u, D.z + (HOLE.z - D.z) * u);
    // Gravity with drag: the fall builds to cruise speed instead of accelerating forever.
    S.vy = CRUISE * Math.tanh((9.8 * t) / CRUISE);
    S.y -= S.vy * dt;
    S.basePitch = FALL_PITCH * ease(clamp(t / 0.85, 0, 1));
    S.fov = 62 + 10 * smooth(0, 1.2, t);
    S.roll = Math.sin(t * 5) * 0.05 * (1 - clamp(t / 1.3, 0, 1));
    S.speed = 0;
    camera.position.set(S.pos.x, S.y, S.pos.y);
    if (t > 1.35) enterWell();
  }

  function updateWell(dt) {
    turnInput(dt);
    const yaw = S.heading + S.look.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const { f, s } = moveInput();
    want.set(fx * f - fz * s, fz * f + fx * s).multiplyScalar(DRIFT);
    if ((f || s) && !S.drifted) {
      S.drifted = true;
      hud.hideHint();
    }
    S.vel.x = damp(S.vel.x, want.x, 3, dt);
    S.vel.y = damp(S.vel.y, want.y, 3, dt);
    S.pos.x += S.vel.x * dt;
    S.pos.y += S.vel.y * dt;

    // Keep the body off the wall, and soak up the push into it.
    const room = radiusAt(S.y - 0.9) - 0.75;
    let dx = S.pos.x - HOLE.x;
    let dz = S.pos.y - HOLE.z;
    const r = Math.hypot(dx, dz);
    if (r > room) {
      dx *= room / r;
      dz *= room / r;
      S.pos.set(HOLE.x + dx, HOLE.z + dz);
      const out = (S.vel.x * dx + S.vel.y * dz) / room;
      if (out > 0) {
        S.vel.x -= (dx / room) * out * 1.4;
        S.vel.y -= (dz / room) * out * 1.4;
      }
    }
    drift.x = (S.vel.x * -fz + S.vel.y * fx) / DRIFT;
    drift.z = (S.vel.x * fx + S.vel.y * fz) / DRIFT;

    if (S.dive) {
      const D = S.dive;
      D.t += dt;
      const u = Math.min(D.t / D.T, 1);
      S.vy = D.profile.v(u);
      // Placed from the profile, not integrated, so the ring and the bottom
      // are exactly where they were promised.
      S.y = D.y0 - D.profile.dist(u);
      if (!D.passed && u > GATE_AT && !D.toBottom) {
        D.passed = true;
        flashPulse(0.22);
      }
      if (D.toBottom) S.shake = smooth(0.7, 1, u) * 0.35;
      if (u >= 1) {
        if (D.toBottom) {
          die();
          camera.position.set(S.pos.x, S.y, S.pos.y);
          return;
        }
        arrive(D.to);
      }
    } else {
      S.vy = damp(S.vy, reduce.matches ? 2.5 : CRUISE, 1.5, dt);
      S.y -= S.vy * dt;
    }

    const k = clamp((S.vy - CRUISE) / (DIVE - CRUISE), 0, 1);
    S.fov = damp(S.fov, 72 + 20 * k, 6, dt);
    S.roll = damp(S.roll, -drift.x * 0.07, 4, dt);
    S.basePitch = damp(S.basePitch, FALL_PITCH + k * 0.25, 4, dt);
    const sway = reduce.matches ? 0 : Math.sin(S.t * 1.7) * 0.03;
    camera.position.set(S.pos.x, S.y + sway, S.pos.y);
  }

  function bob(dt) {
    S.stepPhase += S.speed * dt * (Math.PI / 0.75);
    if (reduce.matches) return 0;
    const amp = 0.035 * Math.min(S.speed / 3, 1);
    return -Math.abs(Math.sin(S.stepPhase)) * amp;
  }

  // The point the current object floats toward: ahead of the body, inside the wall.
  function aheadPoint(out) {
    out.set(S.pos.x - Math.sin(S.bodyYaw) * PROP_AHEAD, S.pos.y - Math.cos(S.bodyYaw) * PROP_AHEAD);
    const dx = out.x - HOLE.x;
    const dz = out.y - HOLE.z;
    const r = Math.hypot(dx, dz);
    const max = WELL.r - 0.8;
    if (r > max) out.set(HOLE.x + (dx * max) / r, HOLE.z + (dz * max) / r);
    return out;
  }

  const aim = new THREE.Vector2();
  function floatObject(o, relY, dt) {
    if (!o) return;
    o.visible = relY < 30 && relY > -80;
    if (!o.visible) return;
    aheadPoint(aim);
    const p = o.userData.p || (o.userData.p = aim.clone());
    p.x = damp(p.x, aim.x, 1.6, dt);
    p.y = damp(p.y, aim.y, 1.6, dt);
    o.position.set(p.x, S.y + relY + Math.sin(S.t * 1.3) * 0.08, p.y);
    if (!reduce.matches) {
      const sp = o.userData.spin;
      o.rotation.x += sp.x * dt;
      o.rotation.y += sp.y * dt;
      o.rotation.z = Math.sin(S.t * 0.7) * sp.z;
    }
  }

  function updateObjects(dt) {
    if (S.phase !== "well") return;
    if (S.dive) {
      const D = S.dive;
      const u = Math.min(D.t / D.T, 1);
      const e = D.profile.extra(u);
      // The object you leave keeps falling at cruise speed, so it rises past
      // you as you dive; the next one was already falling below.
      floatObject(stops[D.from].object, -PROP_BELOW + e, dt);
      if (!D.toBottom && D.to !== D.from) floatObject(stops[D.to].object, -PROP_BELOW - (D.profile.totalExtra - e), dt);
    } else {
      floatObject(stops[S.stop].object, -PROP_BELOW, dt);
    }
  }

  // Hitting the bottom at full speed. The feet land and the knees fold, then
  // the body goes over backwards like a plank pivoting on its feet, faster as
  // it falls, until the back and head hit the floor. You end up lying there,
  // head lifted a little, looking down your own body at your shoes.
  const crashRoot = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  const crashEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const eyeLocal = new THREE.Vector3();
  const bend = new THREE.Vector3();

  function updateCrash(dt) {
    const C = S.crash;
    if (C.t < CRASH.still) C.t = Math.min(C.t + dt, CRASH.still);
    const t = C.t;
    const yaw = C.yaw0 + wrapAngle(C.yaw1 - C.yaw0) * easeOut(clamp(t / CRASH.fold, 0, 1));
    let tilt = 0;
    if (t > CRASH.fold) tilt = (Math.PI / 2) * Math.pow(clamp((t - CRASH.fold) / (CRASH.hit - CRASH.fold), 0, 1), 2);
    if (t > CRASH.hit && t < CRASH.hit + 0.2) tilt -= 0.07 * Math.sin((Math.PI * (t - CRASH.hit)) / 0.2); // the head bounces once
    const squat = t < CRASH.fold ? easeOut(t / CRASH.fold) : 1 - smooth(CRASH.fold, 0.45, t);

    crashEuler.set(tilt, yaw, 0);
    crashRoot.quaternion.setFromEuler(crashEuler);
    // Folded knees drop the hips; lying down, the back rests on the floor.
    crashRoot.position
      .set(C.feet.x, C.floor + 0.13 * Math.sin(tilt), C.feet.y)
      .add(bend.set(0, -0.2 * squat, 0).applyQuaternion(crashRoot.quaternion));
    // After the hit the head lifts off the floor enough to see over the chest.
    const lift = smooth(CRASH.hit + 0.15, 1.3, t);
    eyeLocal.set(0, 1.6 - 0.18 * squat - 0.08 * smooth(CRASH.fold, 0.45, t), -0.13 - 0.2 * lift);
    camera.position.copy(crashRoot.position).add(eyeLocal.applyQuaternion(crashRoot.quaternion));

    // The gaze rides the body over, then the head lifts to look at the feet.
    const look = t < CRASH.hit ? C.pitch0 + (-1.25 - C.pitch0) * smooth(0, CRASH.hit, t) : -1.25 - 0.2 * lift;
    const roll = 0.25 * smooth(CRASH.fold, 0.6, t) + (reduce.matches ? 0 : 0.03 * Math.sin(t * 1.7) * smooth(0.6, 1.2, t));
    camera.rotation.set(tilt + look, yaw, roll);

    if (!C.splat && t >= CRASH.hit) {
      C.splat = true;
      S.shake = 0.7;
      hud.showEnd();
    }
    if (S.shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * S.shake * 0.1;
      camera.position.y += (Math.random() - 0.5) * S.shake * 0.06;
      camera.rotation.z += (Math.random() - 0.5) * S.shake * 0.05;
      S.shake *= Math.exp(-9 * dt);
    }
    S.fov = damp(S.fov, 70, 4, dt);
    const fov = S.fov * (camera.aspect < 0.8 ? 1.18 : 1);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    // Once everything has settled there's nothing left to animate.
    if (t >= CRASH.still && S.shake < 0.01) pause();
  }

  function updateBody(dt) {
    const yaw = S.heading + S.look.yaw;
    S.bodyYaw += wrapAngle(yaw - S.bodyYaw) * (1 - Math.exp(-6 * dt));
    let mode = "walk";
    if (S.phase === "drop") mode = S.drop && S.drop.t < 0.65 ? "flail" : "fall";
    else if (S.phase === "well") mode = S.dive ? "dive" : "fall";
    else if (S.crash) mode = S.crash.t < CRASH.hit ? "crash" : "lie";
    body.update(dt, {
      mode,
      speed: S.phase === "void" ? S.speed : 0,
      phase: S.stepPhase,
      t: S.t,
      dx: S.phase === "well" ? drift.x : 0,
      dz: S.phase === "well" ? drift.z : 0,
      x: S.pos.x,
      y: S.phase === "void" ? EYE : S.y,
      z: S.pos.y,
      yaw: S.bodyYaw,
      onFloor: S.phase === "void" && Math.hypot(S.pos.x - HOLE.x, S.pos.y - HOLE.z) > HOLE_R + 0.25,
      crashT: S.crash ? S.crash.t : 0,
      root: S.crash ? crashRoot : null,
    });
  }

  function updateLook(dt) {
    const L = S.look;
    const falling = S.phase !== "void";
    // In the void the mouse near the bottom of the screen tips the view down
    // to your own shoes; in the well it tilts around the downward gaze.
    L.touchPitch = clamp(L.touchPitch, falling ? -0.5 : -1.25, falling ? 0.55 : 0.6);
    let tYaw;
    let tPitch;
    if (coarse) {
      tYaw = L.touchYaw;
      tPitch = L.touchPitch;
    } else {
      tYaw = -L.nx * (falling ? 0.9 : 0.85);
      tPitch = falling ? -L.ny * 0.5 : L.ny < 0 ? -L.ny * 0.32 : -L.ny * 0.35 - 0.8 * smooth(0.35, 1, L.ny);
    }
    L.yaw = damp(L.yaw, tYaw, coarse ? 10 : 5, dt);
    L.pitch = damp(L.pitch, tPitch, coarse ? 10 : 5, dt);
    const pitch = clamp(L.pitch + S.basePitch, -1.52, 0.6);
    camera.rotation.set(pitch, S.heading + L.yaw, S.roll);
    if (S.shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * S.shake * 0.12;
      camera.position.y += (Math.random() - 0.5) * S.shake * 0.12;
      camera.rotation.z += (Math.random() - 0.5) * S.shake * 0.05;
      if (S.phase === "dead") S.shake *= Math.exp(-6 * dt);
    }
    const fov = S.fov * (camera.aspect < 0.8 ? 1.18 : 1);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  function updateAtmosphere(dt) {
    const y = camera.position.y;
    const k = 1 - smooth(-12, 0.5, y);
    scene.background.copy(sky).lerp(deep, k);
    shared.uFogColor.value.copy(scene.background);
    world.void.group.visible = y > -30;
    // The hole's own light would flare on the body as it drops past it.
    const glow = world.void.glowLight;
    glow.intensity = damp(glow.intensity, S.phase === "void" ? 26 : 0, 10, dt);
    world.well.follow(y);
    world.well.up.position.set(S.pos.x, y - 5, S.pos.y);
    world.well.up.intensity = y < -2 ? palette.up : 0;
    const streaks = world.well.streaks;
    streaks.lines.visible = (S.phase === "drop" || S.phase === "well") && !reduce.matches;
    if (streaks.lines.visible) streaks.update(S.y, S.vy, dt);
    hud.setDepth(EYE - S.y);
  }

  function updateHover() {
    if (!pointer.hoverDirty || coarse) return;
    pointer.hoverDirty = false;
    let hot = false;
    if (S.phase === "void") hot = !!pick(pointer.x, pointer.y, holeTargets);
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

  let last_ = performance.now();
  let active = true;
  let looping = false;
  let firstFrame = true;
  function frame(now) {
    const dt = Math.min((now - last_) / 1000, 0.05);
    last_ = now;
    S.t += dt;
    shared.uTime.value = S.t;
    if (S.phase === "void") updateVoid(dt);
    else if (S.phase === "drop") {
      if (S.drop) updateDrop(dt);
    } else if (S.phase === "well") updateWell(dt);
    else if (S.crash) updateCrash(dt);
    updateObjects(dt);
    updateBody(dt);
    if (!S.crash) updateLook(dt);
    updateAtmosphere(dt);
    updateHover();
    updateDust(dt);
    renderer.render(scene, camera);
    holo.update(dt, camera);
    drawHands();
    if (firstFrame) {
      firstFrame = false;
      onProgress(1);
    }
  }

  // The hand layer copies the main view and its lights every frame.
  function drawHands() {
    handCam.position.copy(camera.position);
    handCam.quaternion.copy(camera.quaternion);
    if (handCam.fov !== camera.fov || handCam.aspect !== camera.aspect) {
      handCam.fov = camera.fov;
      handCam.aspect = camera.aspect;
      handCam.updateProjectionMatrix();
    }
    const L = world.lights;
    handLight.hemi.color.copy(L.hemi.color);
    handLight.hemi.groundColor.copy(L.hemi.groundColor);
    handLight.hemi.intensity = L.hemi.intensity;
    handLight.sun.color.copy(L.sun.color);
    handLight.sun.intensity = L.sun.intensity;
    handLight.sun.position.copy(L.sun.position);
    for (const k of ["up", "glow"]) {
      const src = k === "up" ? world.well.up : world.void.glowLight;
      handLight[k].color.copy(src.color);
      handLight[k].intensity = src.intensity;
      src.getWorldPosition(handLight[k].position);
    }
    handRenderer.render(handScene, handCam);
  }

  function resize() {
    const w = root.clientWidth;
    const h = root.clientHeight;
    renderer.setSize(w, h, false);
    handRenderer.setSize(w, h, false);
    holo.layout(w, h);
    camera.aspect = w / h;
    camera.fov = S.fov * (camera.aspect < 0.8 ? 1.18 : 1);
    camera.updateProjectionMatrix();
    // Resizing clears the canvas; redraw it if nothing else is about to.
    if (!looping && w && h) {
      renderer.render(scene, camera);
      holo.update(0, camera);
      drawHands();
    }
  }
  window.addEventListener("resize", resize);
  resize();

  function pause() {
    looping = false;
    renderer.setAnimationLoop(null);
  }
  function resume() {
    if (!active) return;
    looping = true;
    last_ = performance.now();
    renderer.setAnimationLoop(frame);
  }

  function setTheme(name) {
    palette = PALETTES[name];
    sky.set(palette.sky);
    deep.set(palette.deep);
    world.setTheme(name);
    setPropTheme(name);
    if (!looping) {
      renderer.render(scene, camera);
      drawHands();
    }
  }

  // Compile every material once up front, so the first dive doesn't stutter.
  function warmUp() {
    const shown = [world.well.gate, world.well.bottom, world.well.streaks.lines, ...stops.map((s) => s.object).filter(Boolean)];
    shown.forEach((o) => (o.visible = true));
    renderer.compile(scene, camera);
    handRenderer.compile(handScene, handCam);
    shown.forEach((o) => (o.visible = false));
  }

  setTheme(theme);
  warmUp();
  root.dataset.phase = "void";
  resume();

  return {
    setTheme,
    reset,
    pause() {
      active = false;
      keys.clear();
      if (stick) stick.release();
      pause();
    },
    resume() {
      active = true;
      resize();
      if (S.phase !== "dead") resume();
    },
  };
}

// The visitor's own body, so first person still has someone in it. Hips, legs
// and sneakers stand in the world under the camera; the forearms ride with the
// camera, sized to the screen, so the gloved hands stay framed on a phone too.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/RoundedBoxGeometry.js";

// Charcoal long sleeves and gloves, indigo jeans, off-white sneakers.
export const OUTFIT = {
  sleeve: "#3b3d43",
  rib: "#4c4f56",
  glove: "#232428",
  denim: "#3d5a88",
  hem: "#33496d",
  shoe: "#efebe2",
  sole: "#2b2d31",
  buckle: "#c9c2b6",
};

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const smoothstep = (t) => t * t * (3 - 2 * t);
const std = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, ...extra });
const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
const capsule = (r, len, mat) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat);
const at = (mesh, x, y, z) => {
  mesh.position.set(x, y, z);
  return mesh;
};

// Twill lines and a little noise, multiplied into the denim colour.
function denimTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#dfe3ea";
  g.fillRect(0, 0, 256, 256);
  g.lineWidth = 1.3;
  for (let i = -256; i < 512; i += 4) {
    g.strokeStyle = "rgba(255,255,255,0.45)";
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 256, 256);
    g.stroke();
    g.strokeStyle = "rgba(30,40,60,0.16)";
    g.beginPath();
    g.moveTo(i + 2, 0);
    g.lineTo(i + 258, 256);
    g.stroke();
  }
  for (let i = 0; i < 2600; i++) {
    const v = Math.random() < 0.5 ? 255 : 40;
    g.fillStyle = `rgba(${v},${v},${v},0.12)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

// A hand with its wrist at the origin, fingers along -z and the palm facing -y.
// side is 1 for the right hand, -1 for the left. Also used for the glove prop.
export function buildHand(mat, side) {
  const hand = new THREE.Group();
  hand.add(at(rbox(0.088, 0.032, 0.1, 0.014, mat), 0, 0, -0.05));
  // Two segments per finger, so a curl bends at the middle joint too.
  const fingers = [0.055, 0.064, 0.06, 0.047].map((len, i) => {
    const pivot = new THREE.Group();
    const x = side * (i - 1.5) * 0.021;
    pivot.position.set(x, 0, -0.096);
    const a = len * 0.55;
    const b = len * 0.45;
    const near = capsule(0.0105, a, mat);
    near.rotation.x = -Math.PI / 2;
    near.position.z = -(a / 2 + 0.005);
    const joint = new THREE.Group();
    joint.position.z = -(a + 0.012);
    const tip = capsule(0.0098, b, mat);
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -(b / 2 + 0.004);
    joint.add(tip);
    pivot.add(near, joint);
    pivot.userData.splay = -x * 2.4;
    pivot.userData.joint = joint;
    hand.add(pivot);
    return pivot;
  });
  const thumb = new THREE.Group();
  thumb.position.set(-side * 0.045, -0.004, -0.03);
  const t = capsule(0.012, 0.042, mat);
  t.rotation.x = -Math.PI / 2;
  t.position.z = -0.026;
  thumb.add(t);
  thumb.rotation.set(-0.1, side * 0.75, 0);
  hand.add(thumb);
  hand.userData.fingers = fingers;
  return hand;
}

// point blends toward a poke: index finger straight, the rest curled in.
function pose(hand, curl, splay, point = 0) {
  hand.userData.fingers.forEach((f, i) => {
    const c = curl + ((i === 0 ? 0.04 : 1.35) - curl) * point;
    f.rotation.x = -c;
    f.rotation.y = f.userData.splay * (splay + (0.15 - splay) * point);
    f.userData.joint.rotation.x = -c * 1.3;
  });
}

function buildShoe(m) {
  const g = new THREE.Group();
  g.add(at(rbox(0.112, 0.034, 0.29, 0.014, m.sole), 0, -0.033, -0.045));
  g.add(at(rbox(0.104, 0.08, 0.255, 0.036, m.shoe), 0, 0.012, -0.04));
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.056, 0.06, 16), m.shoe), 0, 0.055, 0.03));
  for (let i = 0; i < 3; i++) {
    const lace = rbox(0.064, 0.009, 0.014, 0.004, m.sole);
    lace.rotation.x = -0.35;
    g.add(at(lace, 0, 0.05 - i * 0.006, -0.03 - i * 0.032));
  }
  g.add(at(rbox(0.034, 0.045, 0.014, 0.006, m.sole), 0, 0.06, 0.088));
  return g;
}

function buildLegs(m) {
  const body = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.93;
  body.add(hips);
  hips.add(at(rbox(0.3, 0.17, 0.19, 0.06, m.denim), 0, 0, 0));
  hips.add(at(rbox(0.31, 0.045, 0.2, 0.016, m.sole), 0, 0.075, 0));
  hips.add(at(rbox(0.05, 0.035, 0.012, 0.006, m.buckle), 0, 0.075, -0.1));
  // Kept low and flat: looking down you see a chest, not a wall.
  const torso = capsule(0.15, 0.18, m.sleeve);
  torso.scale.z = 0.62;
  hips.add(at(torso, 0, 0.22, 0.03));
  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group();
    hip.position.set(s * 0.09, -0.02, 0);
    hips.add(hip);
    hip.add(at(capsule(0.08, 0.3, m.denim), 0, -0.21, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.43;
    hip.add(knee);
    knee.add(at(capsule(0.066, 0.32, m.denim), 0, -0.2, 0));
    knee.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.078, 0.06, 18), m.hem), 0, -0.38, 0));
    const ankle = new THREE.Group();
    ankle.position.y = -0.43;
    knee.add(ankle);
    ankle.add(buildShoe(m));
    return { s, hip, knee, ankle };
  });
  return { body, legs };
}

function buildArm(m, side) {
  const arm = new THREE.Group();
  const sleeve = capsule(0.042, 0.3, m.sleeve);
  sleeve.rotation.x = Math.PI / 2;
  arm.add(at(sleeve, 0, 0, 0.19));
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.05, 16), m.rib);
  cuff.rotation.x = Math.PI / 2;
  arm.add(at(cuff, 0, 0, 0.01));
  const hand = buildHand(m.glove, side);
  arm.add(hand);
  return { side, arm, hand };
}

// ---------- poses ----------
// Legs: hip pitch (hx, forward is +), hip roll (hz), knee (kx, bends -), ankle (ax).
// Arms: wrist position as a fraction of the visible half-width and half-height
// at depth z, then forearm rotation, wrist bend and finger curl/splay.

function walkLeg(s, a, ph) {
  const p = ph + (s > 0 ? Math.PI : 0);
  return {
    hx: Math.sin(p) * 0.45 * a,
    hz: s * 0.02,
    kx: -Math.max(0, Math.sin(p + 1.25)) * 0.8 * a - 0.04,
    ax: Math.sin(p + 0.5) * 0.22 * a,
  };
}

function fallLeg(s, t, dx, dz) {
  return {
    hx: 0.95 + Math.sin(t * 8.3 + s * 1.9) * 0.035 - dz * 0.16,
    hz: s * 0.13 - dx * 0.12 + Math.sin(t * 6.1 + s) * 0.02,
    kx: -0.82 + Math.sin(t * 7.7 + s * 2.3) * 0.05,
    ax: -0.35,
  };
}

function diveLeg(s) {
  return { hx: 0.08, hz: s * 0.025, kx: -0.04, ax: -0.75 };
}

function flailLeg(s, t) {
  const p = t * 9 + (s > 0 ? Math.PI : 0);
  return { hx: 0.55 + Math.sin(p) * 0.45, hz: s * 0.2, kx: -0.9 - Math.sin(p) * 0.3, ax: -0.2 };
}

// Standing, the hands rest just under the frame; walking swings each one up
// into the corner, opposite to its leg.
// Hitting the bottom: the feet land, the knees fold, then the legs swing out
// straight as the body goes over backwards and settles flat, feet splayed.
function crashLeg(s, t) {
  const u = Math.min(t / 0.12, 1);
  const v = smoothstep(clamp((t - 0.12) / 0.43, 0, 1));
  const squat = { hx: 0.08 + 0.85 * u, hz: s * 0.03, kx: -0.04 - 1.25 * u, ax: -0.75 + 0.9 * u };
  const lie = { hx: 0.08, hz: s * 0.17, kx: -0.14, ax: -0.55 };
  return {
    hx: squat.hx + (lie.hx - squat.hx) * v,
    hz: squat.hz + (lie.hz - squat.hz) * v,
    kx: squat.kx + (lie.kx - squat.kx) * v,
    ax: squat.ax + (lie.ax - squat.ax) * v,
  };
}

function walkArm(s, a, ph) {
  const sw = Math.sin(ph + (s > 0 ? 0 : Math.PI)) * a;
  return {
    x: 0.6,
    y: -0.98 + a * 0.18 + sw * 0.2,
    z: -0.44 - sw * 0.05,
    rx: 0.46 - sw * 0.2,
    ry: s * 0.06,
    rz: -s * 0.35,
    wx: -0.7,
    curl: 0.65,
    splay: 0.4,
  };
}

// Spread out for balance, palms down, low in the corners so the System
// panels above stay clear; the forearms run out of frame.
function fallArm(s, t) {
  return {
    x: 0.82,
    y: -0.76 + Math.sin(t * 7.1 + s) * 0.03,
    z: -0.56,
    rx: 0.95,
    ry: s * 0.25,
    rz: -s * 0.1 + Math.sin(t * 11.3 + s * 2) * 0.06,
    wx: -0.15,
    curl: 0.25,
    splay: 1.2,
  };
}

function diveArm(s) {
  return { x: 0.55, y: -1.7, z: -0.3, rx: 0.3, ry: s * 0.1, rz: -s * 0.5, wx: -0.2, curl: 0.3, splay: 0.4 };
}

function flailArm(s, t) {
  return {
    x: 0.8,
    y: 0.02 + Math.sin(t * 14 + s) * 0.06,
    z: -0.56,
    rx: 1.3,
    ry: -s * 0.5,
    rz: -s * 0.3,
    wx: 0.1,
    curl: 0.05,
    splay: 2,
  };
}

// Thrown up by reflex while going over backwards.
function crashArm(s, t) {
  return {
    x: 0.78,
    y: 0.05 + Math.sin(t * 16 + s) * 0.05,
    z: -0.52,
    rx: 1.25,
    ry: -s * 0.45,
    rz: -s * 0.3,
    wx: 0.1,
    curl: 0.1,
    splay: 1.8,
  };
}

// Lying still: the hands rest on the floor at your sides, palms up.
function lieArm(s) {
  return { x: 0.9, y: -0.86, z: -0.5, rx: 0.15, ry: s * 0.35, rz: -s * 2.7, wx: 0.2, curl: 0.75, splay: 0.4 };
}

const LEG_KEYS = ["hx", "hz", "kx", "ax"];
const ARM_KEYS = ["x", "y", "z", "rx", "ry", "rz", "wx", "curl", "splay"];

function mix(parts, keys) {
  const out = {};
  let total = 0;
  for (const [w] of parts) total += w;
  for (const k of keys) {
    let v = 0;
    for (const [w, p] of parts) v += w * p[k];
    out[k] = v / (total || 1);
  }
  return out;
}

// A press: reach out along the line of sight, hold, and come back.
const PRESS_T = 0.55;
function pressWeight(t) {
  if (t < 0.13) return easeOut(t / 0.13);
  if (t < 0.24) return 1;
  return 1 - smoothstep(Math.min((t - 0.24) / (PRESS_T - 0.24), 1));
}

const FWD = new THREE.Vector3(0, 0, -1);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const _tip = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _side = new THREE.Vector3();
const _shoulder = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _roll = new THREE.Quaternion();

function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(0,0,0,1)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// camera: the one the forearms ride on. Hands are drawn in their own layer
// above the System panels, so this is the overlay camera that copies the view.
export function buildBody(scene, camera) {
  const m = {
    sleeve: std(OUTFIT.sleeve, { roughness: 0.95 }),
    rib: std(OUTFIT.rib, { roughness: 0.95 }),
    glove: std(OUTFIT.glove, { roughness: 0.55 }),
    denim: std(OUTFIT.denim, { map: denimTexture(), roughness: 0.92 }),
    hem: std(OUTFIT.hem),
    shoe: std(OUTFIT.shoe, { roughness: 0.7 }),
    sole: std(OUTFIT.sole),
    buckle: std(OUTFIT.buckle, { metalness: 0.4, roughness: 0.4 }),
  };
  const { body, legs } = buildLegs(m);
  scene.add(body);
  const arms = [buildArm(m, -1), buildArm(m, 1)];
  const rig = new THREE.Group();
  for (const a of arms) rig.add(a.arm);
  camera.add(rig);

  // A soft contact shadow, so the shoes sit on the void floor instead of above it.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 24),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.32 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = 1;
  scene.add(shadow);

  const W = { walk: 1, fall: 0, dive: 0, flail: 0, crash: 0, lie: 0 };

  // s: { mode, speed, phase, t, dx, dz, x, y, z, yaw, onFloor, crashT, root }
  // x/y/z is the camera position, yaw the body's facing.
  function update(dt, s) {
    const quick = s.mode === "flail" || s.mode === "crash";
    for (const k in W) W[k] = damp(W[k], k === s.mode ? 1 : 0, quick ? 14 : 5, dt);
    const a = clamp(s.speed / 3.4, 0, 1);

    const fx = -Math.sin(s.yaw);
    const fz = -Math.cos(s.yaw);
    if (s.root) {
      // Hitting the bottom, the body is posed whole, pivoting on its feet.
      body.position.copy(s.root.position);
      body.quaternion.copy(s.root.quaternion);
    } else {
      body.position.set(s.x - fx * 0.13, s.y - 1.6, s.z - fz * 0.13);
      body.rotation.set(0, s.yaw, 0);
    }
    for (const L of legs) {
      const p = mix(
        [
          [W.walk, walkLeg(L.s, a, s.phase)],
          [W.fall, fallLeg(L.s, s.t, s.dx, s.dz)],
          [W.dive, diveLeg(L.s)],
          [W.flail, flailLeg(L.s, s.t)],
          [W.crash + W.lie, crashLeg(L.s, s.crashT || 0)],
        ],
        LEG_KEYS,
      );
      L.hip.rotation.set(p.hx, 0, p.hz);
      L.knee.rotation.x = p.kx;
      L.ankle.rotation.x = p.ax;
    }

    // Arms are framed from the camera's current field of view and aspect, so
    // the hands sit at the screen edges on a wide monitor and a tall phone,
    // where they also shrink so they don't fill the narrow view.
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fit = clamp(camera.aspect / 1.4, 0.5, 1);
    for (const A of arms) {
      const p = mix(
        [
          [W.walk, walkArm(A.side, a, s.phase)],
          [W.fall, fallArm(A.side, s.t)],
          [W.dive, diveArm(A.side)],
          [W.flail, flailArm(A.side, s.t)],
          [W.crash, crashArm(A.side, s.t)],
          [W.lie, lieArm(A.side)],
        ],
        ARM_KEYS,
      );
      const depth = -p.z;
      const px = p.x + (1 - fit) * 0.1;
      A.arm.position.set(A.side * px * depth * tanV * camera.aspect, p.y * depth * tanV, p.z);
      A.arm.rotation.set(p.rx, p.ry, p.rz);
      A.arm.scale.setScalar(fit);
      A.hand.rotation.x = p.wx;
      let point = 0;
      if (A.press) {
        A.press.t += dt;
        if (A.press.t >= PRESS_T) A.press = null;
        else {
          const w = pressWeight(A.press.t);
          // The fingertip lands on the line through the pressed point, pushing
          // in a little at the bottom of the press. The forearm comes from the
          // shoulder, below and to the side of the eye.
          _tip.copy(A.press.target);
          if (A.press.t > 0.1 && A.press.t < 0.26) _tip.multiplyScalar(1.04);
          _shoulder.set(A.side * 0.2, -0.34, 0.02);
          _dir.subVectors(_tip, _shoulder).normalize();
          _q.setFromUnitVectors(FWD, _dir).multiply(_roll.setFromAxisAngle(AXIS_Z, -A.side * 0.35));
          _side.copy(AXIS_X).applyQuaternion(_q);
          _tip.addScaledVector(_dir, -0.18 * fit).addScaledVector(_side, 0.0315 * A.side * fit);
          A.arm.position.lerp(_tip, w);
          A.arm.quaternion.slerp(_q, w);
          A.hand.rotation.x *= 1 - w;
          point = w;
        }
      }
      pose(A.hand, p.curl, p.splay, point);
    }

    shadow.visible = s.onFloor;
    if (s.onFloor) shadow.position.set(body.position.x, 0.006, body.position.z);
  }

  function setVisible(v) {
    body.visible = rig.visible = v;
    if (!v) shadow.visible = false;
  }

  // side: -1 left hand, 1 right. target: the fingertip, in camera space.
  function press(side, target) {
    const A = arms.find((a) => a.side === side);
    A.press = { t: 0, target: target.clone() };
  }

  return { update, setVisible, press };
}

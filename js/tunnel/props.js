// Small clay objects that fall alongside the visitor at each stop, built from
// simple shapes. Each is roughly 0.5 m across with its base at y = 0.
// Swap any of them for a .glb later by returning a loaded scene instead.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/RoundedBoxGeometry.js";
import { buildHand } from "./body.js";

const clay = (c, extra = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, ...extra });

const M = {
  cream: clay("#f3eee4"),
  stone: clay("#b9b1a3"),
  ink: clay("#2b2d31"),
  amber: clay("#f2a541", { emissive: "#f2a541", emissiveIntensity: 0.35 }),
  screen: clay("#ffe3b3", { emissive: "#ffcf86", emissiveIntensity: 0.55 }),
};

const box = (w, h, d, r, mat) => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
  return m;
};
const cyl = (r, h, mat, seg = 24) =>
  new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
const at = (mesh, x, y, z) => {
  mesh.position.set(x, y, z);
  return mesh;
};

// SPAKE: communications and electronics assets, so a handheld radio.
function radio() {
  const g = new THREE.Group();
  g.add(at(box(0.24, 0.42, 0.12, 0.04, M.cream), 0, 0.21, 0));
  g.add(at(box(0.17, 0.1, 0.02, 0.015, M.screen), 0, 0.3, 0.06));
  for (let i = 0; i < 4; i++) g.add(at(box(0.15, 0.014, 0.02, 0.006, M.ink), 0, 0.12 + i * 0.03, 0.06));
  g.add(at(cyl(0.018, 0.3, M.ink), 0.07, 0.56, 0));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), M.amber), 0.07, 0.72, 0));
  g.add(at(cyl(0.03, 0.04, M.stone), -0.06, 0.44, 0));
  return g;
}

// SPKB: integrated computer management, so a laptop.
function laptop() {
  const g = new THREE.Group();
  g.add(at(box(0.5, 0.035, 0.34, 0.015, M.cream), 0, 0.02, 0));
  g.add(at(box(0.38, 0.006, 0.16, 0.003, M.stone), 0, 0.04, 0.03));
  const lid = new THREE.Group();
  lid.add(at(box(0.5, 0.32, 0.025, 0.015, M.cream), 0, 0.16, 0));
  lid.add(at(box(0.44, 0.26, 0.006, 0.006, M.screen), 0, 0.165, 0.014));
  lid.position.set(0, 0.035, -0.16);
  lid.rotation.x = -0.28;
  g.add(lid);
  return g;
}

// FMS: fleet management, so a small truck.
function truck() {
  const g = new THREE.Group();
  g.add(at(box(0.42, 0.24, 0.24, 0.04, M.cream), -0.06, 0.2, 0));
  g.add(at(box(0.18, 0.2, 0.23, 0.05, M.stone), 0.25, 0.18, 0));
  g.add(at(box(0.02, 0.09, 0.17, 0.01, M.screen), 0.345, 0.22, 0));
  for (const [x, z] of [[-0.16, 0.12], [0.2, 0.12], [-0.16, -0.12], [0.2, -0.12]]) {
    const w = cyl(0.065, 0.05, M.ink);
    w.rotation.x = Math.PI / 2;
    g.add(at(w, x, 0.065, z));
  }
  g.add(at(box(0.05, 0.03, 0.05, 0.012, M.amber), 0.25, 0.3, 0));
  return g;
}

// KamiTrack: a phone with a location pin over it.
function phone() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.add(at(box(0.26, 0.5, 0.04, 0.05, M.ink), 0, 0, 0));
  body.add(at(box(0.22, 0.43, 0.006, 0.035, M.screen), 0, 0, 0.022));
  body.position.y = 0.3;
  body.rotation.x = -0.12;
  g.add(body);
  const pin = new THREE.Group();
  pin.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 16), M.amber), 0, 0.09, 0));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 20), M.amber);
  tip.rotation.x = Math.PI;
  pin.add(at(tip, 0, 0.02, 0));
  pin.position.set(0.12, 0.6, 0.06);
  g.add(pin);
  g.userData.bob = pin;
  return g;
}

// RunCloud assessment: a server rack with a padlock.
function server() {
  const g = new THREE.Group();
  g.add(at(box(0.3, 0.5, 0.3, 0.04, M.stone), 0, 0.25, 0));
  for (let i = 0; i < 4; i++) {
    g.add(at(box(0.24, 0.07, 0.02, 0.01, M.cream), 0, 0.08 + i * 0.11, 0.15));
    g.add(at(box(0.025, 0.025, 0.01, 0.006, M.amber), 0.09, 0.08 + i * 0.11, 0.165));
  }
  const lock = new THREE.Group();
  lock.add(at(box(0.14, 0.12, 0.06, 0.025, M.ink), 0, 0, 0));
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 20, Math.PI), M.ink);
  lock.add(at(shackle, 0, 0.06, 0));
  lock.position.set(0.12, 0.58, 0.1);
  lock.rotation.z = -0.2;
  g.add(lock);
  return g;
}

// Kamching: game logic, so a die.
function die() {
  const g = new THREE.Group();
  const cube = new THREE.Group();
  cube.add(box(0.32, 0.32, 0.32, 0.07, M.cream));
  const pip = new THREE.SphereGeometry(0.028, 12, 10);
  const add = (x, y, z) => cube.add(at(new THREE.Mesh(pip, M.ink), x, y, z));
  add(0, 0, 0.16);
  for (const s of [-1, 1]) add(0.08 * s, 0.08 * s, -0.16);
  for (const [a, b] of [[-1, -1], [1, 1], [0, 0]]) add(0.16, 0.08 * a, 0.08 * b);
  cube.rotation.set(0.5, 0.6, 0.15);
  cube.position.y = 0.28;
  g.add(cube);
  return g;
}

// Enterprise API docs: a stack of documents with a brace mark.
function docs() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const sheet = box(0.34, 0.03, 0.44, 0.012, i === 2 ? M.cream : M.stone);
    sheet.rotation.y = (i - 1) * 0.16;
    g.add(at(sheet, (i - 1) * 0.02, 0.03 + i * 0.045, 0));
  }
  const brace = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 24, Math.PI), M.amber);
  brace.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  g.add(at(brace, -0.05, 0.15, 0));
  const brace2 = brace.clone();
  brace2.rotation.z = -Math.PI / 2;
  g.add(at(brace2, 0.05, 0.15, 0));
  return g;
}

// Toolkit: a toolbox.
function toolbox() {
  const g = new THREE.Group();
  g.add(at(box(0.46, 0.22, 0.24, 0.035, M.stone), 0, 0.11, 0));
  g.add(at(box(0.48, 0.05, 0.26, 0.02, M.cream), 0, 0.235, 0));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 20, Math.PI), M.ink);
  g.add(at(handle, 0, 0.26, 0));
  g.add(at(box(0.06, 0.035, 0.02, 0.008, M.amber), 0, 0.2, 0.125));
  return g;
}

// Education: a graduation cap.
function cap() {
  const g = new THREE.Group();
  g.add(at(cyl(0.15, 0.14, M.ink, 32), 0, 0.07, 0));
  const board = box(0.46, 0.025, 0.46, 0.01, M.ink);
  board.rotation.y = Math.PI / 4;
  g.add(at(board, 0, 0.15, 0));
  g.add(at(cyl(0.006, 0.16, M.amber), 0.2, 0.08, 0));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), M.amber), 0, 0.17, 0));
  return g;
}

// Profile: a hard hat, for the time spent on production floors.
function hardhat() {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    M.amber,
  );
  g.add(at(dome, 0, 0.03, 0));
  const brim = cyl(0.25, 0.025, M.amber, 40);
  brim.scale.z = 0.85;
  g.add(at(brim, 0.03, 0.03, 0));
  g.add(at(box(0.05, 0.03, 0.34, 0.012, M.cream), 0, 0.2, 0));
  return g;
}

// Career, current role: a briefcase.
function briefcase() {
  const g = new THREE.Group();
  g.add(at(box(0.5, 0.34, 0.15, 0.04, M.stone), 0, 0.17, 0));
  g.add(at(box(0.5, 0.02, 0.152, 0.008, M.ink), 0, 0.27, 0));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.017, 8, 20, Math.PI), M.ink);
  g.add(at(handle, 0, 0.34, 0));
  for (const x of [-0.13, 0.13]) g.add(at(box(0.05, 0.035, 0.02, 0.008, M.amber), x, 0.27, 0.078));
  return g;
}

// AIC Semiconductor: a chip on its pins.
function chip() {
  const g = new THREE.Group();
  g.add(at(box(0.36, 0.05, 0.36, 0.02, M.ink), 0, 0.06, 0));
  g.add(at(box(0.12, 0.012, 0.12, 0.006, M.amber), 0, 0.09, 0));
  for (let i = 0; i < 5; i++) {
    const o = -0.12 + i * 0.06;
    g.add(at(box(0.026, 0.02, 0.07, 0.006, M.cream), o, 0.03, 0.2));
    g.add(at(box(0.026, 0.02, 0.07, 0.006, M.cream), o, 0.03, -0.2));
    g.add(at(box(0.07, 0.02, 0.026, 0.006, M.cream), 0.2, 0.03, o));
    g.add(at(box(0.07, 0.02, 0.026, 0.006, M.cream), -0.2, 0.03, o));
  }
  return g;
}

// RISAU: GCP and RunCloud hosting, so a cloud.
function cloud() {
  const g = new THREE.Group();
  for (const [x, y, r] of [[-0.15, 0.14, 0.12], [0, 0.2, 0.16], [0.16, 0.14, 0.12], [0.05, 0.1, 0.13]]) {
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), M.cream), x, y, 0));
  }
  g.add(at(box(0.08, 0.08, 0.02, 0.01, M.amber), 0.02, 0.17, 0.17));
  return g;
}

// Aspen Glove: quality checks on gloves, so an inspection glove.
function glove() {
  const g = new THREE.Group();
  const hand = buildHand(M.cream, 1);
  hand.scale.setScalar(2.4);
  hand.rotation.set(-Math.PI / 2, 0, 0.2);
  g.add(at(hand, 0, 0.12, 0.1));
  g.add(at(cyl(0.075, 0.12, M.cream), 0, 0.06, 0.12));
  return g;
}

// Earlier roles, mostly equipment repair: a wrench.
function wrench() {
  const g = new THREE.Group();
  const w = new THREE.Group();
  w.add(at(box(0.07, 0.44, 0.035, 0.016, M.stone), 0, 0, 0));
  const head = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 10, 24, Math.PI * 1.45), M.ink);
  head.rotation.z = -Math.PI * 0.22;
  w.add(at(head, 0, 0.27, 0));
  w.rotation.z = 0.5;
  w.position.y = 0.25;
  g.add(w);
  return g;
}

// Systems Arena: the game, so a gamepad.
function gamepad() {
  const g = new THREE.Group();
  g.add(at(box(0.44, 0.1, 0.22, 0.05, M.ink), 0, 0.08, 0));
  for (const x of [-0.18, 0.18]) g.add(at(box(0.12, 0.09, 0.2, 0.045, M.ink), x, 0.07, 0.07));
  g.add(at(box(0.09, 0.02, 0.03, 0.008, M.cream), -0.12, 0.14, -0.01));
  g.add(at(box(0.03, 0.02, 0.09, 0.008, M.cream), -0.12, 0.14, -0.01));
  for (const [x, z] of [[0.1, -0.03], [0.15, 0.01]]) {
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), M.amber), x, 0.14, z));
  }
  return g;
}

// Contact: an envelope.
function envelope() {
  const g = new THREE.Group();
  g.add(at(box(0.46, 0.03, 0.32, 0.012, M.cream), 0, 0.02, 0));
  const flap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.012, 3), M.stone);
  flap.scale.set(1.2, 1, 0.75);
  flap.rotation.y = Math.PI;
  g.add(at(flap, 0, 0.04, -0.03));
  g.add(at(cyl(0.035, 0.014, M.amber), 0, 0.048, 0.03));
  return g;
}

const BUILDERS = {
  radio,
  laptop,
  truck,
  phone,
  server,
  die,
  docs,
  toolbox,
  cap,
  hardhat,
  briefcase,
  chip,
  cloud,
  glove,
  wrench,
  gamepad,
  envelope,
};

// The object alone, centred on its own middle so it can tumble in the air.
export function buildObject(kind) {
  const make = BUILDERS[kind];
  const object = make ? make() : new THREE.Group();
  const box3 = new THREE.Box3().setFromObject(object);
  const mid = box3.getCenter(new THREE.Vector3());
  object.position.sub(mid);
  const group = new THREE.Group();
  group.add(object);
  return group;
}

export function setPropTheme(name) {
  M.cream.color.set(name === "night" ? "#d9d3c7" : "#f3eee4");
  M.stone.color.set(name === "night" ? "#8f887c" : "#b9b1a3");
}

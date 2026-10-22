// Small clay objects that stand beside each exhibit, built from simple shapes.
// Each is roughly 0.5 m across and sits with its base at y = 0.
// Swap any of them for a .glb later by returning a loaded scene instead.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/RoundedBoxGeometry.js";

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

const BUILDERS = { radio, laptop, truck, phone, server, die, docs, toolbox, cap, hardhat };

// A rounded plinth with the object on top.
export function buildProp(kind) {
  const group = new THREE.Group();
  const plinth = box(0.62, 0.7, 0.62, 0.08, M.cream);
  plinth.position.y = 0.35;
  group.add(plinth);
  const make = BUILDERS[kind];
  const object = make ? make() : new THREE.Group();
  object.position.y = 0.72;
  group.add(object);
  group.userData.object = object;
  return group;
}

export function setPropTheme(name) {
  M.cream.color.set(name === "night" ? "#d9d3c7" : "#f3eee4");
  M.stone.color.set(name === "night" ? "#8f887c" : "#b9b1a3");
}

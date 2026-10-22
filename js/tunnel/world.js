// The static world: the void with its glowing hole, the shaft, and the tunnel.
// Units are metres. The void floor is y = 0; the tunnel floor is y = -DEPTH.
import * as THREE from "three";

export const HOLE = new THREE.Vector3(0, 0, -16);
export const HOLE_R = 2;
export const DEPTH = 60;
export const EYE = 1.6;

export const TUNNEL = {
  halfWidth: 3,
  wallHeight: 1.8, // straight wall before the arch starts
  height: 4.8, // wallHeight + halfWidth
  length: 130,
  ringGap: 6,
};

const CHAMBER_R = 3.4;
// Distance 0 in the tunnel is the mouth, just past the landing chamber.
export const T0 = HOLE.z - 1.2;
export const FLOOR_Y = -DEPTH;
export const zAt = (d) => T0 - d;
export const LANDING_D = T0 - HOLE.z; // the chamber centre, in tunnel distance

export const PALETTES = {
  day: {
    sky: "#e9e5dc",
    voidFloor: "#e2ddd2",
    voidLine: "#cbc3b4",
    glow: "#ffbf5e",
    glowStrength: 0.55,
    beam: 0.34,
    rim: "#f3eee4",
    shaftWall: "#d9cbb3",
    tunnelFog: "#d8d1c4",
    wall: "#e6e0d4",
    floor: "#cfc7b8",
    strip: "#d9962f",
    ring: "#ffd28c",
    ambient: 0.62,
    pool: 0.5,
    hemiSky: "#ffffff",
    hemiGround: "#bfb4a2",
    hemi: 1.5,
    sun: 1.1,
    paint: "#2b2d31",
    paintSoft: "#6a645b",
    end: "#fff3dc",
  },
  night: {
    sky: "#16181c",
    voidFloor: "#1d2024",
    voidLine: "#2c3036",
    glow: "#ffad42",
    glowStrength: 0.95,
    beam: 0.42,
    rim: "#3a3d43",
    shaftWall: "#3b3227",
    tunnelFog: "#141518",
    wall: "#45464b",
    floor: "#2c2d31",
    strip: "#c98426",
    ring: "#ffc06a",
    ambient: 0.3,
    pool: 1.05,
    hemiSky: "#8d93a3",
    hemiGround: "#1a1b1f",
    hemi: 0.75,
    sun: 0.55,
    paint: "#eeebe4",
    paintSoft: "#a9a49b",
    end: "#ffe2b0",
  },
};

const color = (hex) => new THREE.Color(hex);

// Shared by every custom shader so a theme change or fog shift is one write.
export const shared = {
  uFogColor: { value: color("#e9e5dc") },
  uFogNear: { value: 14 },
  uFogFar: { value: 70 },
  uTime: { value: 0 },
  uGlow: { value: color("#ffbf5e") },
};

const FOG_GLSL = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
`;
const FOG_APPLY = /* glsl */ `
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
`;

const BASE_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vec4 mv = viewMatrix * w;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

function finish(src) {
  return src.replace(
    "#FINISH",
    "gl_FragColor = vec4(col, 1.0);\n#include <colorspace_fragment>",
  );
}

// ---------- textures, drawn once on canvas ----------

function canvasTexture(w, h, draw, repeat = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// Subway wall tiles: 0.5 m x 0.25 m, staggered. Greyscale, tinted per theme.
function tileTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = "#cfcfcf";
    g.fillRect(0, 0, w, h);
    const tw = w / 2;
    const th = h / 4;
    for (let r = 0; r < 4; r++) {
      const off = r % 2 ? tw / 2 : 0;
      for (let c = -1; c < 3; c++) {
        const x = c * tw + off;
        const y = r * th;
        const shade = 242 + ((r * 7 + c * 13) % 3) * 4;
        const grad = g.createLinearGradient(0, y, 0, y + th);
        grad.addColorStop(0, `rgb(${shade + 6},${shade + 6},${shade + 6})`);
        grad.addColorStop(1, `rgb(${shade - 8},${shade - 8},${shade - 8})`);
        g.fillStyle = grad;
        g.beginPath();
        g.roundRect(x + 3, y + 3, tw - 6, th - 6, 6);
        g.fill();
      }
    }
  });
}

function floorTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = "#f2f2f2";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      const v = 225 + Math.random() * 30;
      g.fillStyle = `rgba(${v},${v},${v},0.5)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.strokeStyle = "rgba(0,0,0,0.1)";
    g.lineWidth = 4;
    g.strokeRect(0, 0, w, h);
  });
}

// Tactile paving bars, the kind that guide people along a walkway.
function stripTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = "#c8c8c8";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.roundRect(i * 32 + 8, 10, 16, h - 20, 8);
      g.fill();
    }
  });
}

// ---------- materials ----------

function tunnelMaterial(map, tile, base) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      ...shared,
      uMap: { value: map },
      uTile: { value: new THREE.Vector2(tile[0], tile[1]) },
      uColor: { value: color(base) },
      uLight: tunnelUniforms.uLight,
      uAmbient: tunnelUniforms.uAmbient,
      uPool: tunnelUniforms.uPool,
      uEnd: tunnelUniforms.uEnd,
      uHoleGlow: tunnelUniforms.uHoleGlow,
    },
    vertexShader: BASE_VERT,
    fragmentShader: finish(/* glsl */ `
      ${FOG_GLSL}
      uniform sampler2D uMap;
      uniform vec2 uTile;
      uniform vec3 uColor;
      uniform vec3 uLight;
      uniform vec3 uEnd;
      uniform vec3 uGlow;
      uniform float uAmbient;
      uniform float uPool;
      uniform float uHoleGlow;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vec3 tex = texture2D(uMap, vUv * uTile).rgb;
        float h = clamp((vWorld.y - ${FLOOR_Y.toFixed(1)}) / ${TUNNEL.height.toFixed(1)}, 0.0, 1.0);
        float rz = mod(${T0.toFixed(2)} - vWorld.z, ${TUNNEL.ringGap.toFixed(1)});
        float dz = min(rz, ${TUNNEL.ringGap.toFixed(1)} - rz);
        float pool = exp(-dz * dz * 0.14) * (0.55 + 0.45 * h);
        float ao = mix(0.72, 1.0, smoothstep(0.0, 0.7, vWorld.y - ${FLOOR_Y.toFixed(1)}));
        ao *= mix(1.0, 0.8, smoothstep(2.3, 3.0, abs(vWorld.x)) * step(vWorld.y, ${(FLOOR_Y + 0.02).toFixed(2)}));
        float toEnd = max(vWorld.z - ${(T0 - TUNNEL.length).toFixed(1)}, 0.0);
        float endF = exp(-toEnd * 0.09);
        float hd = length(vWorld.xz - vec2(${HOLE.x.toFixed(1)}, ${HOLE.z.toFixed(1)}));
        float hole = uHoleGlow * exp(-hd * 0.45) * (0.35 + 0.65 * h);
        vec3 col = uColor * tex * (uAmbient + uPool * pool) * ao;
        col += uLight * pool * 0.05 + uGlow * hole * 0.45 + uEnd * endF * 0.75;
        ${FOG_APPLY}
        #FINISH
      }
    `),
  });
}

const tunnelUniforms = {
  uLight: { value: color("#ffd28c") },
  uAmbient: { value: 0.6 },
  uPool: { value: 0.5 },
  uEnd: { value: color("#fff3dc") },
  uHoleGlow: { value: 0.6 },
};

function voidFloorMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uColor: { value: color("#e2ddd2") },
      uLine: { value: color("#cbc3b4") },
      uStrength: { value: 0.55 },
    },
    vertexShader: BASE_VERT,
    fragmentShader: finish(/* glsl */ `
      ${FOG_GLSL}
      uniform vec3 uColor;
      uniform vec3 uLine;
      uniform vec3 uGlow;
      uniform float uStrength;
      uniform float uTime;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vec2 p = vWorld.xz;
        vec2 g = abs(fract(p / 1.5 - 0.5) - 0.5) * 1.5;
        float line = 1.0 - smoothstep(0.0, 0.02 + vDepth * 0.0016, min(g.x, g.y));
        line *= 1.0 - smoothstep(8.0, 34.0, vDepth);
        float d = length(p - vec2(${HOLE.x.toFixed(1)}, ${HOLE.z.toFixed(1)})) - ${HOLE_R.toFixed(1)};
        float glow = exp(-max(d, 0.0) * 0.3);
        float shimmer = 0.88 + 0.12 * sin(uTime * 1.4 - d * 2.4);
        vec3 col = mix(uColor, uLine, line * 0.6);
        col += uGlow * glow * uStrength * shimmer;
        ${FOG_APPLY}
        #FINISH
      }
    `),
  });
}

function shaftMaterial(top, bottom) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      ...shared,
      uWall: { value: color("#d9cbb3") },
    },
    vertexShader: BASE_VERT,
    fragmentShader: finish(/* glsl */ `
      uniform vec3 uWall;
      uniform vec3 uGlow;
      uniform float uTime;
      varying vec3 vWorld;
      void main() {
        float t = clamp((${top.toFixed(1)} - vWorld.y) / ${(top - bottom).toFixed(1)}, 0.0, 1.0);
        float band = smoothstep(0.86, 1.0, abs(fract(vWorld.y / 3.0) * 2.0 - 1.0));
        vec3 col = mix(uWall * 0.55, uGlow, smoothstep(0.0, 0.35, t) * 0.85);
        col += uGlow * band * (0.25 + 0.6 * smoothstep(0.02, 0.2, t));
        col *= mix(0.45, 1.0, smoothstep(0.0, 0.03, t));
        #FINISH
      }
    `),
  });
}

function beamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { ...shared, uOpacity: { value: 0.5 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vFacing;
      void main() {
        vUv = uv;
        vec3 n = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFacing = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uGlow;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      varying float vFacing;
      void main() {
        float fade = pow(1.0 - vUv.y, 2.2);
        float soft = pow(vFacing, 1.6);
        float flicker = 0.92 + 0.08 * sin(uTime * 0.9 + vUv.x * 12.0);
        gl_FragColor = vec4(uGlow * fade * soft * uOpacity * flicker, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

function dustMaterial(size) {
  const sprite = canvasTexture(
    64,
    64,
    (g) => {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, "rgba(255,255,255,1)");
      r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 64, 64);
    },
    false,
  );
  return new THREE.PointsMaterial({
    size,
    map: sprite,
    color: shared.uGlow.value,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.8,
  });
}

// ---------- geometry ----------

// The tunnel's cross-section: straight walls, then a half-circle roof.
function archProfile() {
  const { halfWidth: w, wallHeight: h } = TUNNEL;
  const pts = [
    [-w, 0],
    [-w, h * 0.5],
    [-w, h],
  ];
  const segs = 28;
  for (let i = 1; i < segs; i++) {
    const a = Math.PI - (Math.PI * i) / segs;
    pts.push([w * Math.cos(a), h + w * Math.sin(a)]);
  }
  pts.push([w, h], [w, h * 0.5], [w, 0]);
  return pts;
}

function archShape(inset = 0) {
  const { halfWidth: w, wallHeight: h } = TUNNEL;
  const s = new THREE.Shape();
  s.moveTo(-w + inset, 0);
  s.lineTo(-w + inset, h);
  s.absarc(0, h, w - inset, Math.PI, 0, true);
  s.lineTo(w - inset, 0);
  s.lineTo(-w + inset, 0);
  return s;
}

function tunnelGeometry() {
  const prof = archProfile();
  const lens = [0];
  for (let i = 1; i < prof.length; i++) {
    lens.push(
      lens[i - 1] +
        Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]),
    );
  }
  const rows = TUNNEL.length + 1;
  const pos = [];
  const uv = [];
  const idx = [];
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < prof.length; i++) {
      pos.push(prof[i][0], prof[i][1], -r);
      uv.push(r, lens[i]);
    }
  }
  const n = prof.length;
  for (let r = 0; r < rows - 1; r++) {
    for (let i = 0; i < n - 1; i++) {
      const a = r * n + i;
      const b = a + n;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------- builders ----------

function buildVoid(mats) {
  const group = new THREE.Group();
  group.name = "void";

  const floor = new THREE.Mesh(
    new THREE.RingGeometry(HOLE_R, 160, 96, 1),
    mats.voidFloor,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.copy(HOLE);
  floor.userData.kind = "floor";
  group.add(floor);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(HOLE_R + 0.1, 0.16, 18, 96),
    mats.rim,
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(HOLE.x, 0.02, HOLE.z);
  rim.userData.kind = "hole";
  group.add(rim);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(HOLE_R * 0.95, HOLE_R * 1.25, 10, 48, 1, true),
    mats.beam,
  );
  beam.position.set(HOLE.x, 5, HOLE.z);
  beam.renderOrder = 2;
  beam.userData.kind = "hole";
  group.add(beam);

  // Invisible target so clicking anywhere over the opening counts.
  const hit = new THREE.Mesh(
    new THREE.CircleGeometry(HOLE_R + 0.3, 32),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.rotation.x = -Math.PI / 2;
  hit.position.set(HOLE.x, 0.01, HOLE.z);
  hit.userData.kind = "hole";
  group.add(hit);

  // Motes rising in the beam, and a few drifting across the void.
  const count = 520;
  const p = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const inBeam = i < 360;
    const a = Math.random() * Math.PI * 2;
    const r = inBeam ? Math.sqrt(Math.random()) * HOLE_R : 4 + Math.random() * 30;
    p[i * 3] = HOLE.x + Math.cos(a) * r;
    p[i * 3 + 1] = Math.random() * (inBeam ? 9 : 5);
    p[i * 3 + 2] = HOLE.z + Math.sin(a) * r;
    speed[i] = inBeam ? 0.25 + Math.random() * 0.5 : 0.04 + Math.random() * 0.08;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const dust = new THREE.Points(dustGeo, mats.dust);
  dust.userData.speed = speed;
  dust.userData.beamCount = 360;
  group.add(dust);

  const glowLight = new THREE.PointLight(0xffbf5e, 26, 14, 1.6);
  glowLight.position.set(HOLE.x, -0.6, HOLE.z);
  group.add(glowLight);

  return { group, floor, rim, beam, hit, dust, glowLight };
}

function buildShaft(mats) {
  const group = new THREE.Group();
  const top = 0;
  const bottom = FLOOR_Y + TUNNEL.height;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(HOLE_R, HOLE_R, top - bottom, 40, 1, true),
    mats.shaft,
  );
  shaft.position.set(HOLE.x, (top + bottom) / 2, HOLE.z);
  group.add(shaft);

  // A light disc at the bottom, seen only from above, so the hole reads as
  // bright and deep from the void. Falling through it is the transition.
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(HOLE_R, 40),
    new THREE.MeshBasicMaterial({ color: shared.uGlow.value }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(HOLE.x, bottom + 0.02, HOLE.z);
  group.add(disc);
  return { group, shaft, disc };
}

function buildTunnel(mats) {
  const group = new THREE.Group();
  group.name = "tunnel";

  const shell = new THREE.Mesh(tunnelGeometry(), mats.wall);
  shell.position.set(0, FLOOR_Y, T0);
  group.add(shell);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(TUNNEL.halfWidth * 2, TUNNEL.length, 1, 1),
    mats.floor,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, FLOOR_Y, T0 - TUNNEL.length / 2);
  scaleUv(floor.geometry, TUNNEL.halfWidth * 2, TUNNEL.length);
  group.add(floor);

  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, TUNNEL.length - 4),
    mats.strip,
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(0, FLOOR_Y + 0.004, T0 - (TUNNEL.length - 4) / 2);
  scaleUv(strip.geometry, 1, (TUNNEL.length - 4) / 0.34);
  group.add(strip);

  // Landing chamber: a round room under the shaft, open toward the tunnel.
  const gap = Math.asin(TUNNEL.halfWidth / CHAMBER_R);
  const chamber = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CHAMBER_R,
      CHAMBER_R,
      TUNNEL.height,
      48,
      1,
      true,
      Math.PI + gap,
      Math.PI * 2 - gap * 2,
    ),
    mats.wall,
  );
  chamber.position.set(HOLE.x, FLOOR_Y + TUNNEL.height / 2, HOLE.z);
  scaleUv(chamber.geometry, CHAMBER_R * 2 * Math.PI, TUNNEL.height);
  group.add(chamber);

  const ceiling = new THREE.Mesh(
    new THREE.RingGeometry(HOLE_R, CHAMBER_R + 0.05, 48, 1),
    mats.wall,
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(HOLE.x, FLOOR_Y + TUNNEL.height, HOLE.z);
  group.add(ceiling);

  const chamberFloor = new THREE.Mesh(
    new THREE.CircleGeometry(CHAMBER_R + 0.05, 48),
    mats.floor,
  );
  chamberFloor.rotation.x = -Math.PI / 2;
  chamberFloor.position.set(HOLE.x, FLOOR_Y - 0.003, HOLE.z);
  scaleUv(chamberFloor.geometry, CHAMBER_R * 2, CHAMBER_R * 2);
  group.add(chamberFloor);

  // Header wall above the tunnel mouth, filling the space the arch leaves.
  const header = new THREE.Shape();
  header.moveTo(-CHAMBER_R, 0);
  header.lineTo(CHAMBER_R, 0);
  header.lineTo(CHAMBER_R, TUNNEL.height + 0.05);
  header.lineTo(-CHAMBER_R, TUNNEL.height + 0.05);
  header.lineTo(-CHAMBER_R, 0);
  header.holes.push(archShape(0.01));
  const headerMesh = new THREE.Mesh(new THREE.ShapeGeometry(header, 24), mats.wall);
  headerMesh.position.set(0, FLOOR_Y, T0 + 0.01);
  group.add(headerMesh);

  // Ring lights following the roof every ringGap metres.
  const ringCount = Math.floor(TUNNEL.length / TUNNEL.ringGap);
  const rings = new THREE.InstancedMesh(
    new THREE.TorusGeometry(TUNNEL.halfWidth - 0.06, 0.05, 6, 40, Math.PI),
    mats.ring,
    ringCount,
  );
  const m = new THREE.Matrix4();
  for (let i = 0; i < ringCount; i++) {
    m.makeTranslation(0, FLOOR_Y + TUNNEL.wallHeight, zAt(i * TUNNEL.ringGap));
    rings.setMatrixAt(i, m);
  }
  group.add(rings);

  // The light at the end of the tunnel.
  const end = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0), 24), mats.end);
  end.position.set(0, FLOOR_Y, zAt(TUNNEL.length) + 0.02);
  group.add(end);

  return { group, rings, end };
}

function scaleUv(geo, sx, sy) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
}

export function buildWorld(scene) {
  const tiles = tileTexture();
  const floorTex = floorTexture();
  const stripTex = stripTexture();
  const mats = {
    voidFloor: voidFloorMaterial(),
    rim: new THREE.MeshStandardMaterial({ color: "#f3eee4", roughness: 0.7 }),
    beam: beamMaterial(),
    dust: dustMaterial(0.07),
    shaft: shaftMaterial(0, FLOOR_Y + TUNNEL.height),
    wall: tunnelMaterial(tiles, [1 / 1.0, 1 / 1.0], "#e6e0d4"),
    floor: tunnelMaterial(floorTex, [1 / 1.5, 1 / 1.5], "#cfc7b8"),
    strip: tunnelMaterial(stripTex, [1, 1], "#d9962f"),
    ring: new THREE.MeshBasicMaterial({ color: "#ffd28c" }),
    end: new THREE.MeshBasicMaterial({ color: "#fff3dc" }),
  };
  const voidParts = buildVoid(mats);
  const shaftParts = buildShaft(mats);
  const tunnelParts = buildTunnel(mats);
  scene.add(voidParts.group, shaftParts.group, tunnelParts.group);

  // Scene-wide light for the clay objects and the rim. Direction only matters.
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbfb4a2, 1.5);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(2, 10, 6);
  scene.add(hemi, sun);

  function setTheme(name) {
    const p = PALETTES[name];
    shared.uGlow.value.set(p.glow);
    mats.voidFloor.uniforms.uColor.value.set(p.voidFloor);
    mats.voidFloor.uniforms.uLine.value.set(p.voidLine);
    mats.voidFloor.uniforms.uStrength.value = p.glowStrength;
    mats.beam.uniforms.uOpacity.value = p.beam;
    mats.rim.color.set(p.rim);
    mats.shaft.uniforms.uWall.value.set(p.shaftWall);
    mats.wall.uniforms.uColor.value.set(p.wall);
    mats.floor.uniforms.uColor.value.set(p.floor);
    mats.strip.uniforms.uColor.value.set(p.strip);
    mats.ring.color.set(p.ring);
    mats.end.color.set(p.end);
    tunnelUniforms.uLight.value.set(p.ring);
    tunnelUniforms.uAmbient.value = p.ambient;
    tunnelUniforms.uPool.value = p.pool;
    tunnelUniforms.uEnd.value.set(p.end);
    hemi.color.set(p.hemiSky);
    hemi.groundColor.set(p.hemiGround);
    hemi.intensity = p.hemi;
    sun.intensity = p.sun;
    voidParts.glowLight.color.set(p.glow);
    shaftParts.disc.material.color.set(p.glow);
    mats.dust.color.set(p.glow);
  }

  return {
    void: voidParts,
    shaft: shaftParts,
    tunnel: tunnelParts,
    setTheme,
    tunnelUniforms,
  };
}

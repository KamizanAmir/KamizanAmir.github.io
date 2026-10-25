// The static world: the void with its glowing hole, and the well under it.
// Units are metres. The void floor is y = 0; the well has no bottom until the
// last stop, so its wall follows the visitor down.
import * as THREE from "three";

export const HOLE = new THREE.Vector3(0, 0, -16);
export const HOLE_R = 2;
export const EYE = 1.6;

export const WELL = {
  r: 3.2, // below the throat the well opens up so there is room to drift
  throat: -9, // where the flare ends and the endless wall begins
  ringGap: 7,
};

export const PALETTES = {
  day: {
    sky: "#e9e5dc",
    voidFloor: "#e2ddd2",
    voidLine: "#cbc3b4",
    glow: "#ffbf5e",
    glowStrength: 0.55,
    beam: 0.34,
    rim: "#f3eee4",
    well: "#ddd0b9",
    deep: "#f2c27c",
    ring: "#ffd28c",
    ambient: 0.62,
    pool: 0.5,
    hemiSky: "#ffffff",
    hemiGround: "#bfb4a2",
    hemi: 1.5,
    sun: 1.1,
    up: 3.5,
    streak: "#8a6533",
    streakAdd: false,
  },
  night: {
    sky: "#16181c",
    voidFloor: "#1d2024",
    voidLine: "#2c3036",
    glow: "#ffad42",
    glowStrength: 0.95,
    beam: 0.42,
    rim: "#3a3d43",
    well: "#5b5046",
    deep: "#8c5418",
    ring: "#ffc06a",
    ambient: 0.32,
    pool: 1.05,
    hemiSky: "#8d93a3",
    hemiGround: "#1a1b1f",
    hemi: 0.75,
    sun: 0.55,
    up: 5,
    streak: "#ffe2b0",
    streakAdd: true,
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
  uDeep: { value: color("#f2c27c") },
};

const FOG_GLSL = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
`;
const FOG_APPLY = /* glsl */ `
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
`;
// The well always fades into its own glowing depth, whatever the void is doing,
// so from the rim the hole reads as deep and lit from below.
const DEEP_APPLY = /* glsl */ `
  col = mix(col, uDeep, smoothstep(6.0, 72.0, vDepth));
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

// Stone courses: 0.5 m x 0.25 m, staggered. Greyscale, tinted per theme.
function blockTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = "#bdbdbd";
    g.fillRect(0, 0, w, h);
    const tw = w / 2;
    const th = h / 4;
    for (let r = 0; r < 4; r++) {
      const off = r % 2 ? tw / 2 : 0;
      for (let c = -1; c < 3; c++) {
        const x = c * tw + off;
        const y = r * th;
        const shade = 232 + ((r * 7 + c * 13) % 3) * 6;
        const grad = g.createLinearGradient(0, y, 0, y + th);
        grad.addColorStop(0, `rgb(${shade + 8},${shade + 8},${shade + 8})`);
        grad.addColorStop(1, `rgb(${shade - 12},${shade - 12},${shade - 12})`);
        g.fillStyle = grad;
        g.beginPath();
        g.roundRect(x + 4, y + 4, tw - 8, th - 8, 10);
        g.fill();
      }
    }
  });
}

// ---------- materials ----------

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

const wellUniforms = {
  uWall: { value: color("#ddd0b9") },
  uRing: { value: color("#ffd28c") },
  uAmbient: { value: 0.62 },
  uPool: { value: 0.5 },
};

// Stone wall with a pool of light around every ring. The pattern is anchored to
// world height, so the wall mesh can slide down with the visitor without the
// stones swimming.
function wellMaterial(map) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...shared, ...wellUniforms, uMap: { value: map } },
    vertexShader: BASE_VERT,
    fragmentShader: finish(/* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uWall;
      uniform vec3 uRing;
      uniform vec3 uDeep;
      uniform float uAmbient;
      uniform float uPool;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vec3 tex = texture2D(uMap, vec2(vUv.x * 20.0, vWorld.y)).rgb;
        float ry = mod(vWorld.y, ${WELL.ringGap.toFixed(1)});
        float dy = min(ry, ${WELL.ringGap.toFixed(1)} - ry);
        float lit = 1.0 - smoothstep(${(WELL.throat - 4).toFixed(1)}, -4.0, vWorld.y);
        float pool = exp(-dy * dy * 0.3) * lit;
        float rim = smoothstep(-1.2, 0.0, vWorld.y);
        vec3 col = uWall * tex * (uAmbient + uPool * pool) * mix(1.0, 0.7, rim);
        col += uRing * pool * 0.08;
        ${DEEP_APPLY}
        #FINISH
      }
    `),
  });
}

// Unlit glowing parts of the well (ring lights, the gate, the bottom), faded
// into the same depth as the wall.
function glowMaterial(hex) {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, uColor: { value: color(hex) } },
    vertexShader: BASE_VERT,
    fragmentShader: finish(/* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uDeep;
      varying float vDepth;
      void main() {
        vec3 col = uColor;
        ${DEEP_APPLY}
        #FINISH
      }
    `),
  });
}

// Flagstones at the bottom of the well, with a soft pool of the light you
// were falling toward.
function bottomMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, ...wellUniforms, uMap: { value: map } },
    vertexShader: BASE_VERT,
    fragmentShader: finish(/* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uGlow;
      uniform vec3 uWall;
      uniform vec3 uDeep;
      uniform float uAmbient;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vec2 p = vWorld.xz - vec2(${HOLE.x.toFixed(1)}, ${HOLE.z.toFixed(1)});
        vec3 tex = texture2D(uMap, p * 0.7).rgb;
        float pool = exp(-dot(p, p) * 0.3);
        vec3 col = uWall * tex * (uAmbient * 0.85 + 0.3 * pool) + uGlow * pool * 0.22;
        ${DEEP_APPLY}
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

// Thin vertical streaks that rush past while falling. Their length follows the
// fall speed, which is what sells a dive more than anything else on screen.
function buildStreaks(mat) {
  const count = 160;
  const pos = new Float32Array(count * 6);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (WELL.r - 0.25);
    seeds.push({ x: HOLE.x + Math.cos(a) * r, z: HOLE.z + Math.sin(a) * r, y: -40 + Math.random() * 52 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;

  // y in seeds is relative to the camera, so the field travels with it.
  function update(camY, vy, dt) {
    const len = Math.min(Math.max(vy * 0.045, 0.04), 4.5);
    const a = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      s.y += vy * dt;
      if (s.y > 12) s.y -= 52;
      const y = camY + s.y;
      a[i * 6] = a[i * 6 + 3] = s.x;
      a[i * 6 + 2] = a[i * 6 + 5] = s.z;
      a[i * 6 + 1] = y;
      a[i * 6 + 4] = y - len;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = Math.min(1, 0.15 + vy / 70);
  }
  return { lines, update };
}

function buildWell(mats) {
  const group = new THREE.Group();
  group.name = "well";

  // The throat: as wide as the hole at the top, flaring out below the floor.
  const pts = [
    [HOLE_R, 0.02],
    [HOLE_R, -2.5],
    [2.45, -4.5],
    [3.0, -6.6],
    [WELL.r, -8],
    [WELL.r, WELL.throat],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const throat = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mats.well);
  throat.position.set(HOLE.x, 0, HOLE.z);
  group.add(throat);

  const SPAN = 420;
  const wallGeo = new THREE.CylinderGeometry(WELL.r, WELL.r, SPAN, 48, 1, true);
  wallGeo.translate(0, -SPAN / 2, 0);
  const wall = new THREE.Mesh(wallGeo, mats.well);
  wall.position.set(HOLE.x, WELL.throat, HOLE.z);
  wall.frustumCulled = false;
  group.add(wall);

  const ringGeo = new THREE.TorusGeometry(WELL.r - 0.05, 0.05, 6, 64);
  const rings = [];
  for (let i = 0; i < 16; i++) {
    const ring = new THREE.Mesh(ringGeo, mats.ring);
    ring.rotation.x = Math.PI / 2;
    ring.frustumCulled = false;
    group.add(ring);
    rings.push(ring);
  }

  // Passed on every dive, so the visitor feels each stop go by.
  const gate = new THREE.Mesh(new THREE.TorusGeometry(WELL.r - 0.1, 0.11, 10, 72), mats.gate);
  gate.rotation.x = Math.PI / 2;
  gate.visible = false;
  group.add(gate);

  const bottom = new THREE.Mesh(new THREE.CircleGeometry(WELL.r + 0.05, 48), mats.bottom);
  bottom.rotation.x = -Math.PI / 2;
  bottom.visible = false;
  group.add(bottom);

  const streaks = buildStreaks(mats.streak);
  streaks.lines.visible = false;
  group.add(streaks.lines);

  // Warm light from below, so hands and shoes read against the wall.
  const up = new THREE.PointLight(0xffbf5e, 4, 14, 1.2);
  group.add(up);

  function follow(camY) {
    wall.position.y = Math.min(WELL.throat, camY + 70);
    const base = Math.floor(camY / WELL.ringGap) * WELL.ringGap;
    rings.forEach((ring, i) => {
      const y = base + (3 - i) * WELL.ringGap;
      ring.visible = y < WELL.throat - 1;
      ring.position.set(HOLE.x, y, HOLE.z);
    });
  }

  return { group, wall, rings, gate, bottom, streaks, up, follow };
}

export function buildWorld(scene) {
  const blocks = blockTexture();
  const mats = {
    voidFloor: voidFloorMaterial(),
    rim: new THREE.MeshStandardMaterial({ color: "#f3eee4", roughness: 0.7 }),
    beam: beamMaterial(),
    dust: dustMaterial(0.07),
    well: wellMaterial(blocks),
    ring: glowMaterial("#ffd28c"),
    gate: glowMaterial("#fff3dc"),
    bottom: bottomMaterial(blocks),
    streak: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.3, depthWrite: false }),
  };
  const voidParts = buildVoid(mats);
  const wellParts = buildWell(mats);
  scene.add(voidParts.group, wellParts.group);

  // Scene-wide light for the clay objects, the body and the rim.
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbfb4a2, 1.5);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(2, 10, 6);
  scene.add(hemi, sun);

  function setTheme(name) {
    const p = PALETTES[name];
    shared.uGlow.value.set(p.glow);
    shared.uDeep.value.set(p.deep);
    mats.voidFloor.uniforms.uColor.value.set(p.voidFloor);
    mats.voidFloor.uniforms.uLine.value.set(p.voidLine);
    mats.voidFloor.uniforms.uStrength.value = p.glowStrength;
    mats.beam.uniforms.uOpacity.value = p.beam;
    mats.rim.color.set(p.rim);
    wellUniforms.uWall.value.set(p.well);
    wellUniforms.uRing.value.set(p.ring);
    wellUniforms.uAmbient.value = p.ambient;
    wellUniforms.uPool.value = p.pool;
    mats.ring.uniforms.uColor.value.set(p.ring);
    hemi.color.set(p.hemiSky);
    hemi.groundColor.set(p.hemiGround);
    hemi.intensity = p.hemi;
    sun.intensity = p.sun;
    voidParts.glowLight.color.set(p.glow);
    wellParts.up.color.set(p.glow);
    wellParts.up.intensity = p.up;
    mats.dust.color.set(p.glow);
    mats.streak.color.set(p.streak);
    mats.streak.blending = p.streakAdd ? THREE.AdditiveBlending : THREE.NormalBlending;
    mats.streak.needsUpdate = true;
  }

  return {
    void: voidParts,
    well: wellParts,
    lights: { hemi, sun },
    setTheme,
  };
}

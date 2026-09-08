import {
  WAVES,
  freshState,
  useAbility,
  damagePlayer,
  clearWave,
} from "./game-state.js";
const $ = (id) => document.getElementById(id);
const skills = [
  [
    "Connected by design.",
    "From SAP Business One invoicing to Laravel and Vue platforms, I connect complex systems into workflows people can use.",
    "../index.html#work",
    "Explore the work ↗",
  ],
  [
    "Built for life on the move.",
    "I designed, built and shipped KamiTrack solo: Flutter fitness tracking, foreground location, social features and a Supabase backend.",
    "../kamitrack.html",
    "Discover KamiTrack ↗",
  ],
  [
    "Reliable from the ground up.",
    "Docker, Linux, GCP and RunCloud support my delivery work. At Mesiniaga, I managed VMware, Hyper-V, Nutanix and Veeam recovery.",
    "../index.html#experience",
    "Explore my experience ↗",
  ],
];
function selectSkill(index) {
  document.querySelectorAll("[data-skill]").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
    el.setAttribute("aria-pressed", String(i === index));
  });
  const [title, copy, href, label] = skills[index];
  $("skill-title").textContent = title;
  $("skill-copy").textContent = copy;
  $("skill-link").href = href;
  $("skill-link").textContent = label;
}
document
  .querySelectorAll("[data-skill]")
  .forEach((el) =>
    el.addEventListener("click", () => selectSkill(Number(el.dataset.skill))),
  );
selectSkill(0);
let state = freshState(),
  best = 0,
  available = false,
  audioContext,
  sound = false;
try {
  best = Number(localStorage.getItem("systems-arena-best")) || 0;
} catch {
  /* Private browsing still supports play. */
}
$("best").textContent = String(best).padStart(5, "0");
$("sound").addEventListener("click", () => {
  sound = !sound;
  $("sound").textContent = sound ? "Sound on" : "Sound off";
  $("sound").setAttribute("aria-pressed", String(sound));
  if (sound) tone(420);
});
function tone(frequency, duration = 0.08) {
  if (!sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended")
      audioContext.resume().catch(() => {});
    const osc = audioContext.createOscillator(),
      gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      frequency / 2,
      audioContext.currentTime + duration,
    );
    gain.gain.setValueAtTime(0.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration,
    );
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  } catch {
    /* Audio is optional. */
  }
}
function saveBest() {
  if (state.score > best) {
    best = state.score;
    $("best").textContent = String(best).padStart(5, "0");
    try {
      localStorage.setItem("systems-arena-best", String(best));
    } catch {}
  }
}
function showOverlay(kicker, title, copy, button) {
  $("overlay-kicker").textContent = kicker;
  $("overlay-title").textContent = title;
  $("overlay-copy").textContent = copy;
  $("start").textContent = button;
  $("overlay").hidden = false;
  $("pause").disabled = true;
  $("start").focus({ preventScroll: true });
}
const keys = new Set(),
  held = new Set();
function clearInput() {
  keys.clear();
  held.clear();
}
function pause() {
  if (state.mode !== "playing") return;
  state.mode = "paused";
  clearInput();
  showOverlay(
    "TAKE A BREATHER",
    "Systems on standby.",
    "Your run is right where you left it. Resume when you’re ready.",
    "Resume run →",
  );
}
$("pause").addEventListener("click", pause);
$("help").addEventListener("click", () => {
  pause();
  $("help-dialog").showModal();
});
$("close-help").addEventListener("click", () => $("help-dialog").close());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("blur", () => {
  clearInput();
  pause();
});
window.addEventListener("keydown", (e) => {
  if ($("help-dialog").open || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
    return;
  if ((e.code === "Escape" || e.code === "KeyP") && state.mode === "playing") {
    e.preventDefault();
    pause();
    return;
  }
  if (state.mode !== "playing") return;
  // Keep normal keyboard activation available on navigation and ability buttons.
  if (
    e.target.closest("button,a") &&
    (e.code === "Space" || e.code === "Enter")
  )
    return;
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "ShiftLeft",
      "ShiftRight",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyE",
    ].includes(e.code)
  ) {
    e.preventDefault();
    keys.add(e.code);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
for (const button of document.querySelectorAll("[data-move],[data-action]")) {
  const key = button.dataset.move || button.dataset.action;
  button.addEventListener("pointerdown", (e) => {
    if (state.mode !== "playing") return;
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    held.add(key);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    button.addEventListener(event, () => held.delete(key));
}
try {
  const THREE = await import("../assets/vendor/three.module.min.js");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x172521);
  scene.fog = new THREE.Fog(0x172521, 28, 65);
  const viewport = $("viewport");
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  viewport.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  const camera = new THREE.OrthographicCamera(-15, 15, 12, -12, 0.1, 100);
  camera.position.set(15, 21, 19);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xe6f3d5, 0x3a5549, 2.6));
  const sun = new THREE.DirectionalLight(0xf1ffca, 3.5);
  sun.position.set(-8, 16, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -16,
    right: 16,
    top: 16,
    bottom: -16,
  });
  sun.shadow.bias = -0.001;
  scene.add(sun);
  function material(color, extra = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.12,
      ...extra,
    });
  }
  const floorMat = material(0x63775b),
    edgeMat = material(0x2d453a),
    lightMat = material(0xd0ed9b, {
      emissive: 0x9bbf57,
      emissiveIntensity: 0.55,
    });
  function mesh(geometry, mat, parent = scene, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  mesh(
    new THREE.CylinderGeometry(11, 11.5, 0.7, 8),
    edgeMat,
    scene,
    0,
    -0.5,
    0,
  );
  mesh(
    new THREE.CylinderGeometry(10.85, 10.85, 0.12, 8),
    floorMat,
    scene,
    0,
    -0.09,
    0,
  );
  const gridPoints = [];
  for (let i = -9; i <= 9; i++) {
    const extent = Math.min(9.7, Math.sqrt(9.7 ** 2 - i ** 2));
    gridPoints.push(
      new THREE.Vector3(i, 0.005, -extent),
      new THREE.Vector3(i, 0.005, extent),
    );
    gridPoints.push(
      new THREE.Vector3(-extent, 0.005, i),
      new THREE.Vector3(extent, 0.005, i),
    );
  }
  scene.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(gridPoints),
      new THREE.LineBasicMaterial({
        color: 0x829672,
        transparent: true,
        opacity: 0.5,
      }),
    ),
  );
  const border = mesh(
    new THREE.TorusGeometry(10.35, 0.055, 6, 8),
    lightMat,
    scene,
    0,
    0.04,
    0,
  );
  border.rotation.x = Math.PI / 2;
  border.rotation.z = Math.PI / 8;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + Math.PI / 8;
    const x = Math.cos(angle) * 10.55,
      z = Math.sin(angle) * 10.55;
    mesh(new THREE.BoxGeometry(0.5, 0.55, 0.5), edgeMat, scene, x, 0.25, z);
    mesh(new THREE.BoxGeometry(0.4, 0.08, 0.4), lightMat, scene, x, 0.57, z);
  }
  // Distant infrastructure makes the arena feel like a world, without imported art.
  for (let i = 0; i < 26; i++) {
    const angle = i * 2.39996,
      radius = 16 + (i % 4) * 3,
      height = 1 + (i % 5) * 1.7;
    mesh(
      new THREE.BoxGeometry(1.6, height, 1.6),
      edgeMat,
      scene,
      Math.cos(angle) * radius,
      height / 2 - 3,
      Math.sin(angle) * radius,
    );
  }
  const bodyMat = material(0xd3f7b5),
    darkMat = material(0x243b32),
    visorMat = material(0x102a2b),
    eyeMat = material(0xbaf5ba, { emissive: 0x8affad, emissiveIntensity: 1 });
  function robot(color, enemy = false) {
    const g = new THREE.Group(),
      armor = enemy ? material(color) : bodyMat;
    mesh(new THREE.BoxGeometry(0.78, 0.8, 0.53), armor, g, 0, 0.85, 0);
    mesh(new THREE.BoxGeometry(0.86, 0.57, 0.63), armor, g, 0, 1.52, 0);
    mesh(new THREE.BoxGeometry(0.66, 0.22, 0.05), visorMat, g, 0, 1.54, 0.34);
    mesh(
      new THREE.BoxGeometry(0.12, 0.075, 0.06),
      enemy ? lightMat : eyeMat,
      g,
      -0.18,
      1.54,
      0.38,
    );
    mesh(
      new THREE.BoxGeometry(0.12, 0.075, 0.06),
      enemy ? lightMat : eyeMat,
      g,
      0.18,
      1.54,
      0.38,
    );
    const limbs = [];
    for (const x of [-0.55, 0.55])
      limbs.push(
        mesh(new THREE.BoxGeometry(0.23, 0.62, 0.3), armor, g, x, 0.87, 0),
      );
    for (const x of [-0.23, 0.23])
      limbs.push(
        mesh(new THREE.BoxGeometry(0.26, 0.42, 0.4), darkMat, g, x, 0.25, 0),
      );
    mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.23, 6),
      darkMat,
      g,
      0,
      1.9,
      0,
    );
    mesh(
      new THREE.SphereGeometry(0.085, 8, 8),
      enemy ? lightMat : eyeMat,
      g,
      0,
      2.03,
      0,
    );
    scene.add(g);
    g.userData.limbs = limbs;
    return g;
  }
  const player = robot();
  const marker = mesh(
    new THREE.ConeGeometry(0.16, 0.25, 3),
    lightMat,
    scene,
    0,
    2.6,
    0,
  );
  marker.rotation.z = Math.PI;
  const rangeRing = mesh(
    new THREE.TorusGeometry(3.25, 0.012, 4, 64),
    new THREE.MeshBasicMaterial({
      color: 0xe1ffc3,
      transparent: true,
      opacity: 0.22,
    }),
    scene,
  );
  rangeRing.rotation.x = Math.PI / 2;
  const shield = mesh(
    new THREE.SphereGeometry(1.3, 20, 12),
    material(0xc3ef9c, { transparent: true, opacity: 0.19, wireframe: true }),
    player,
    0,
    1,
    0,
  );
  shield.visible = false;
  const playerRing = mesh(
    new THREE.TorusGeometry(0.8, 0.035, 6, 32),
    lightMat,
    scene,
  );
  playerRing.rotation.x = Math.PI / 2;
  let enemies = [],
    effects = [],
    lastTime = 0,
    face = new THREE.Vector3(0, 0, 1),
    dashDirection = face.clone(),
    ambientTime = 0,
    contextLost = false;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function removeEnemy(enemy) {
    scene.remove(enemy.object);
    enemy.object.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
      }
    });
    const armor = enemy.object.children[0].material;
    armor.dispose();
  }
  function spawnWave() {
    for (const e of enemies) removeEnemy(e);
    enemies = [];
    const wave = WAVES[state.wave];
    for (let i = 0; i < wave.count; i++) {
      const angle = (i / wave.count) * Math.PI * 2;
      const object = robot(state.wave === 2 ? 0xc77d69 : 0xc49670, true);
      object.position.set(Math.cos(angle) * 8.3, 0, Math.sin(angle) * 8.3);
      enemies.push({ object, hp: wave.health, speed: wave.speed, flash: 0 });
    }
    player.position.set(0, 0, 0);
    state.invulnerable = state.time + 1.2;
    $("mission").textContent = wave.name;
    $("wave-label").textContent = `WAVE 0${state.wave + 1} / 03`;
    selectSkill(state.wave);
  }
  function pulseEffect(position, color, radius = 3.25) {
    const effect = mesh(
      new THREE.TorusGeometry(1, 0.04, 5, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
      scene,
      position.x,
      0.16,
      position.z,
    );
    effect.rotation.x = Math.PI / 2;
    effects.push({ object: effect, life: 0, radius });
  }
  function ability(name) {
    if (!useAbility(state, name)) return;
    if (name === "attack") {
      pulseEffect(player.position, 0xdbffac);
      tone(230);
      for (const enemy of enemies) {
        const distance = enemy.object.position.distanceTo(player.position);
        if (distance < 3.25) {
          enemy.hp--;
          enemy.flash = 0.18;
          const push = enemy.object.position
            .clone()
            .sub(player.position)
            .normalize();
          enemy.object.position.addScaledVector(push, 0.65);
          clampPosition(enemy.object.position, 8.7);
          if (enemy.hp <= 0) {
            state.score += 100;
            pulseEffect(enemy.object.position, 0xf5d3a0, 1);
          }
        }
      }
      const dead = enemies.filter((e) => e.hp <= 0);
      dead.forEach(removeEnemy);
      enemies = enemies.filter((e) => e.hp > 0);
    }
    if (name === "dash") {
      dashDirection.copy(face);
      pulseEffect(player.position, 0xa2dfec, 1.5);
      tone(460);
    }
    if (name === "shield") {
      tone(640, 0.2);
    }
  }
  // Controls are screen-relative despite the angled camera.
  const right = new THREE.Vector3(19, 0, -15).normalize(),
    forward = new THREE.Vector3(-15, 0, -19).normalize();
  function clampPosition(p, radius = 8.6) {
    const length = Math.hypot(p.x, p.z);
    if (length > radius) {
      p.x *= radius / length;
      p.z *= radius / length;
    }
  }
  function updateHud() {
    $("hp-label").textContent = `${state.hp}%`;
    $("hp-bar").style.width = `${state.hp}%`;
    $("score").textContent = String(state.score).padStart(5, "0");
    for (const name of ["attack", "dash", "shield"]) {
      const left = Math.max(0, state.readyAt[name] - state.time);
      const labels = {
        attack: "SPACE / ATTACK",
        dash: "SHIFT / EVADE",
        shield: "E / DEFEND",
      };
      $(name + "-status").textContent =
        left > 0 ? `RECHARGING ${left.toFixed(1)}s` : labels[name];
    }
  }
  function finish() {
    clearInput();
    saveBest();
    updateHud();
    if (state.mode === "lost")
      showOverlay(
        "A BUG GOT THROUGH",
        "Debug. Retry. Improve.",
        `You reached wave ${state.wave + 1} with ${state.score} points. Keep moving, pulse at close range, and use your shield when surrounded.`,
        "Try again →",
      );
    else
      showOverlay(
        "RELEASE SUCCESSFULLY DEPLOYED",
        "Built to ship.",
        `All three waves cleared. ${state.score} points earned. You’ve played through my integration, mobile and infrastructure skills — now explore the real work.`,
        "Play again →",
      );
  }
  function tick(dt) {
    state.time += dt;
    let x =
      Number(keys.has("KeyD") || keys.has("ArrowRight") || held.has("right")) -
      Number(keys.has("KeyA") || keys.has("ArrowLeft") || held.has("left"));
    let y =
      Number(keys.has("KeyW") || keys.has("ArrowUp") || held.has("up")) -
      Number(keys.has("KeyS") || keys.has("ArrowDown") || held.has("down"));
    const direction = right
      .clone()
      .multiplyScalar(x)
      .addScaledVector(forward, y);
    if (direction.lengthSq()) {
      direction.normalize();
      face.copy(direction);
    }
    if (keys.has("Space") || held.has("attack")) ability("attack");
    if (keys.has("ShiftLeft") || keys.has("ShiftRight") || held.has("dash"))
      ability("dash");
    if (keys.has("KeyE") || held.has("shield")) ability("shield");
    if (state.time < state.dashUntil)
      player.position.addScaledVector(dashDirection, 20 * dt);
    else player.position.addScaledVector(direction, 4.8 * dt);
    clampPosition(player.position);
    player.rotation.y = Math.atan2(face.x, face.z);
    player.userData.limbs.forEach(
      (limb, i) =>
        (limb.rotation.x = direction.lengthSq()
          ? Math.sin(state.time * 13 + i * Math.PI) * 0.4
          : 0),
    );
    player.visible = true;
    bodyMat.emissive.setHex(state.time < state.invulnerable ? 0x304421 : 0);
    shield.visible = state.time < state.shieldUntil;
    for (const enemy of enemies) {
      const delta = player.position.clone().sub(enemy.object.position),
        distance = delta.length();
      enemy.object.rotation.y = Math.atan2(delta.x, delta.z);
      if (distance > 0.9)
        enemy.object.position.addScaledVector(
          delta.normalize(),
          enemy.speed * dt,
        );
      enemy.object.position.y = reduceMotion
        ? 0
        : Math.sin(state.time * 5 + enemy.object.id) * 0.06;
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.object.children[0].material.emissive.setHex(
        enemy.flash > 0 ? 0x735d30 : 0,
      );
      if (distance < 1.1 && damagePlayer(state)) tone(90, 0.15);
    }
    if (state.mode === "lost") {
      finish();
      return;
    }
    if (!enemies.length) {
      clearWave(state);
      saveBest();
      clearInput();
      if (state.mode === "won") finish();
      else
        showOverlay(
          `WAVE ${state.wave} COMPLETE / +500 POINTS`,
          ["", "Integration online.", "Mobility unlocked."][state.wave],
          `Integrity restored by up to 25%. Next: ${WAVES[state.wave].name.toLowerCase()}. ${state.wave === 1 ? "Use Flutter Dash to evade faster bugs." : "Use DevOps Shield when the swarm closes in."}`,
          "Deploy next wave →",
        );
    }
    updateHud();
  }
  $("start").addEventListener("click", () => {
    if (!available || contextLost) return;
    if (["ready", "lost", "won"].includes(state.mode)) {
      state = freshState();
      for (const e of effects) {
        scene.remove(e.object);
        e.object.geometry.dispose();
        e.object.material.dispose();
      }
      effects = [];
      spawnWave();
    } else if (state.mode === "between") spawnWave();
    state.mode = "playing";
    clearInput();
    player.visible = true;
    $("overlay").hidden = true;
    $("pause").disabled = false;
    viewport.focus({ preventScroll: true });
    tone(520);
    updateHud();
  });
  function resize() {
    const width = viewport.clientWidth,
      height = viewport.clientHeight;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const halfHeight = aspect < 1 ? 12.5 / aspect : 12;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(viewport);
  resize();
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    pause();
    contextLost = true;
    $("start").disabled = true;
    $("overlay-title").textContent = "Graphics paused.";
    $("overlay-copy").textContent =
      "The graphics context was interrupted. Reload the page to restart, or explore the portfolio.";
  });
  renderer.domElement.addEventListener("webglcontextrestored", () =>
    location.reload(),
  );
  function frame(timestamp) {
    requestAnimationFrame(frame);
    const dt = Math.min((timestamp - lastTime) / 1000, 0.04);
    lastTime = timestamp;
    if (document.hidden || contextLost) return;
    if (state.mode === "playing") {
      ambientTime += dt;
      tick(dt);
    } else if (state.mode === "ready" && !reduceMotion) {
      ambientTime += dt;
      player.rotation.y = Math.sin(ambientTime * 0.5) * 0.5;
    }
    playerRing.position.set(player.position.x, 0.09, player.position.z);
    rangeRing.position.set(player.position.x, 0.07, player.position.z);
    marker.position.set(player.position.x, 2.65, player.position.z);
    if (state.mode === "playing")
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.life += dt;
        const scale = 0.2 + e.life * e.radius * 3;
        e.object.scale.setScalar(scale);
        e.object.material.opacity = Math.max(0, 1 - e.life * 3);
        if (e.life > 0.34) {
          scene.remove(e.object);
          e.object.geometry.dispose();
          e.object.material.dispose();
          effects.splice(i, 1);
        }
      }
    renderer.render(scene, camera);
  }
  available = true;
  $("start").disabled = false;
  $("start").textContent = "Enter the arena →";
  requestAnimationFrame(frame);
} catch (error) {
  console.error("Arena could not initialize:", error);
  $("overlay-title").textContent = "The arena needs WebGL.";
  $("overlay-copy").textContent =
    "3D graphics could not start in this browser. Try a browser with hardware acceleration, or explore all of my skills and work on the portfolio.";
  $("start").hidden = true;
}

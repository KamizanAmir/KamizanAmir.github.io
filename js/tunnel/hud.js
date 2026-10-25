// The heads-up display for the fall, around the System's windows: the
// section gauge, the dive control, the first-time hint and the end screen.

function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt) n.textContent = txt;
  return n;
}

const ARCH =
  '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 25V13a9 9 0 0 1 18 0v12" /></svg>';

export function createHud(root, { stops, sections, coarse, reduce, onDive, onJump, onRetry }) {
  const q = (s) => root.querySelector(s);
  const ui = {
    well: q("#well-ui"),
    gauge: q("#gauge-stops"),
    depth: q("#gauge-depth"),
    hint: q("#well-hint"),
    dive: q("#dive"),
    diveLabel: q("#dive-label"),
    end: q("#end"),
    blood: q("#end-blood"),
    retry: q("#end-retry"),
  };
  const total = stops.length - 1;

  if (coarse) ui.hint.textContent = "Swipe or drift left and right to read more.";
  ui.dive.addEventListener("click", () => onDive());
  ui.retry.addEventListener("click", () => onRetry());

  // ---------- gauge ----------
  const nodes = [
    { no: "", name: "Entrance", first: 0 },
    ...sections.map((s) => ({ ...s, first: stops.findIndex((t) => t.section === s) })),
  ].filter((n) => n.first >= 0);
  const nodeEls = nodes.map((n) => {
    const li = el("li");
    const b = el("button", "gauge-node");
    b.type = "button";
    if (n.no) b.textContent = n.no;
    else b.innerHTML = ARCH;
    b.setAttribute("aria-label", n.no ? `${n.no} ${n.name}` : "Entrance");
    b.addEventListener("click", () => onJump(n.first));
    li.append(b, el("span", "gauge-name", n.name));
    ui.gauge.append(li);
    return li;
  });

  function markGauge(i) {
    let k = 0;
    nodes.forEach((n, j) => {
      if (n.first <= i) k = j;
    });
    nodeEls.forEach((li, j) => {
      const b = li.firstChild;
      if (j === k) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
      li.classList.toggle("passed", j < k);
    });
  }

  // aria-disabled rather than disabled, so a keyboard user's focus stays on the
  // button through the dive instead of dropping back to the top of the page.
  function show(i) {
    markGauge(i);
    ui.diveLabel.textContent = i === total ? "Let go" : "Dive";
    ui.dive.setAttribute("aria-label", i === total ? "Let go and fall to the bottom" : "Dive to the next stop");
    ui.dive.removeAttribute("aria-disabled");
  }

  function shut() {
    ui.dive.setAttribute("aria-disabled", "true");
  }

  function setPhase(on) {
    ui.well.hidden = !on;
  }

  let depthShown = -1;
  function setDepth(m) {
    const v = Math.max(0, Math.round(m));
    if (v === depthShown) return;
    depthShown = v;
    ui.depth.textContent = v.toLocaleString("en");
  }

  function hideHint() {
    ui.hint.classList.add("gone");
  }

  // ---------- the end ----------
  let blood = null;
  function showEnd() {
    ui.end.hidden = false;
    blood = splatter(ui.blood, reduce());
    requestAnimationFrame(() => ui.end.classList.add("on"));
    ui.retry.focus({ preventScroll: true });
  }

  function hideEnd() {
    if (blood) blood.stop();
    blood = null;
    ui.end.classList.remove("on");
    ui.end.hidden = true;
  }

  ui.end.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      ui.retry.focus();
    }
  });

  return {
    show,
    shut,
    setPhase,
    setDepth,
    hideHint,
    showEnd,
    hideEnd,
    resetHint() {
      ui.hint.classList.remove("gone");
    },
  };
}

// ---------- blood ----------
// Drawn once per death at the screen's size: splats with spikes and droplets
// thrown off them, then drips that run down over the next couple of seconds.

function blob(g, x, y, r, rnd) {
  const n = 26;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.72 + rnd() * 0.42 + (rnd() < 0.18 ? 0.35 : 0);
    pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]);
  }
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const p = pts[i % n];
    const q = pts[(i + 1) % n];
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    if (i === 0) g.moveTo(mx, my);
    else g.quadraticCurveTo(p[0], p[1], mx, my);
  }
  g.closePath();
  g.fill();
}

function splatLayer(w, h, rnd) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const R = Math.min(w, h) * 0.15;
  const anchors = [
    [0.5, 0.34, 1.3],
    [0.07, 0.12, 0.95],
    [0.93, 0.1, 0.85],
    [0.05, 0.84, 0.9],
    [0.95, 0.8, 1.05],
    [0.28, 0.95, 0.6],
    [0.74, 0.96, 0.55],
    [0.84, 0.44, 0.45],
    [0.16, 0.47, 0.5],
  ];
  const drips = [];
  for (const [ax, ay, s] of anchors) {
    const x = ax * w + (rnd() - 0.5) * R * 0.6;
    const y = ay * h + (rnd() - 0.5) * R * 0.6;
    const r = R * s * (0.8 + rnd() * 0.35);
    const grad = g.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.1, x, y, r * 1.2);
    grad.addColorStop(0, "#9c0f0f");
    grad.addColorStop(1, "#5a0606");
    g.fillStyle = grad;
    blob(g, x, y, r, rnd);
    // Spikes thrown outward, each ending in a droplet.
    const spikes = 9 + Math.floor(rnd() * 8);
    for (let i = 0; i < spikes; i++) {
      const a = rnd() * Math.PI * 2;
      const len = r * (0.5 + rnd() * 1.1);
      const wd = r * (0.05 + rnd() * 0.08);
      const bx = x + Math.cos(a) * r * 0.7;
      const by = y + Math.sin(a) * r * 0.7;
      const tx = x + Math.cos(a) * (r * 0.7 + len);
      const ty = y + Math.sin(a) * (r * 0.7 + len);
      g.beginPath();
      g.moveTo(bx + Math.cos(a + Math.PI / 2) * wd, by + Math.sin(a + Math.PI / 2) * wd);
      g.lineTo(tx, ty);
      g.lineTo(bx + Math.cos(a - Math.PI / 2) * wd, by + Math.sin(a - Math.PI / 2) * wd);
      g.fill();
      g.beginPath();
      g.arc(tx, ty, wd * (0.9 + rnd()), 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 22; i++) {
      const a = rnd() * Math.PI * 2;
      const d = r * (1.2 + rnd() * 1.6);
      g.beginPath();
      g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + rnd() * r * 0.05, 0, Math.PI * 2);
      g.fill();
    }
    // A wet highlight, so it reads as liquid rather than paint.
    g.fillStyle = "rgba(255, 170, 160, 0.16)";
    g.beginPath();
    g.ellipse(x - r * 0.28, y - r * 0.32, r * 0.26, r * 0.12, -0.5, 0, Math.PI * 2);
    g.fill();
    const count = ay < 0.9 ? 2 + Math.floor(rnd() * 3) : 0;
    for (let i = 0; i < count; i++) {
      drips.push({
        x: x + (rnd() - 0.5) * r * 1.1,
        y: y + r * 0.5,
        w: 3 + rnd() * r * 0.06,
        len: r * (0.8 + rnd() * 2.2),
        rate: 0.6 + rnd() * 0.6,
      });
    }
  }
  return { layer: c, drips };
}

function splatter(canvas, still) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr) || window.innerWidth;
  const h = Math.round(canvas.clientHeight * dpr) || window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  let seed = (Date.now() % 9973) + 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const { layer, drips } = splatLayer(w, h, rnd);

  const vignette = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.72);
  vignette.addColorStop(0, "rgba(80, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(60, 0, 0, 0.82)");

  let raf = 0;
  const t0 = performance.now();
  function draw(now) {
    const t = still ? 10 : (now - t0) / 1000;
    g.clearRect(0, 0, w, h);
    g.fillStyle = vignette;
    g.fillRect(0, 0, w, h);
    g.drawImage(layer, 0, 0);
    g.fillStyle = "#6e0808";
    let running = false;
    for (const d of drips) {
      const u = Math.min(1, (t * d.rate) / 2.2);
      const len = d.len * (1 - Math.pow(1 - u, 2.4));
      if (u < 1) running = true;
      g.beginPath();
      g.roundRect(d.x - d.w / 2, d.y, d.w, len, d.w / 2);
      g.fill();
      g.beginPath();
      g.arc(d.x, d.y + len, d.w * 0.75, 0, Math.PI * 2);
      g.fill();
    }
    if (running && !still) raf = requestAnimationFrame(draw);
  }
  draw(t0);
  return {
    stop() {
      cancelAnimationFrame(raf);
    },
  };
}

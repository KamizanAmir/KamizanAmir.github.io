"use strict";
const html = document.documentElement;
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  },
};

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// formsubmit.co takes a few seconds to redirect to thanks.html; show that the
// submit registered so it isn't pressed twice.
const form = document.getElementById("contact-form");
if (form) {
  form.addEventListener("submit", () => {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Sending…";
    document.getElementById("form-note").textContent =
      "Sending your message. You'll land on a confirmation page when it's through.";
  });
  // Back/forward cache can restore the page with the button still disabled.
  const note = document.getElementById("form-note").textContent;
  window.addEventListener("pageshow", () => {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = false;
    button.textContent = "Send message";
    document.getElementById("form-note").textContent = note;
  });
}

// ---------- theme ----------
let tunnel = null;
const themeToggle = document.getElementById("theme-toggle");

function applyTheme(t) {
  html.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t === "night" ? "#1e2024" : "#eeebe4";
  if (themeToggle) themeToggle.setAttribute("aria-checked", String(t === "night"));
  if (tunnel) tunnel.setTheme(t);
}
applyTheme(html.dataset.theme === "night" ? "night" : "day");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const t = html.dataset.theme === "night" ? "day" : "night";
    store.set("kz-theme", t);
    applyTheme(t);
  });
}

// ---------- tunnel view / page view ----------
const xp = document.getElementById("xp");
const content = document.getElementById("content");
const modeToggle = document.getElementById("mode-toggle");
const skip = document.getElementById("skip-link");
const mark = document.getElementById("mark");

if (xp) {
  const loader = document.getElementById("xp-loader");
  const progress = document.getElementById("xp-progress");
  const loaderText = document.getElementById("xp-loader-text");
  let loading = null;

  function fail(err) {
    console.error(err);
    html.dataset.gl = "0";
    if (tunnel) tunnel.pause();
    tunnel = null;
    const note = document.getElementById("xp-error");
    note.textContent =
      "The 3D tunnel couldn't start on this device, so you're seeing the page view. Everything is here.";
    note.hidden = false;
    setMode("page", { save: false });
  }

  function loadTunnel() {
    if (loading) return loading;
    loader.hidden = false;
    loaderText.textContent = "Loading the tunnel";
    const step = (p) => {
      progress.style.transform = `scaleX(${p})`;
      if (p >= 1) {
        loader.hidden = true;
        xp.dataset.ready = "";
      }
    };
    step(0.1);
    loading = import("./js/tunnel/main.js")
      .then((mod) => {
        step(0.3);
        return mod.start({
          root: xp,
          doc: content,
          theme: html.dataset.theme,
          onProgress: step,
          onError: fail,
        });
      })
      .then((api) => {
        tunnel = api;
        if (html.dataset.mode !== "tunnel") api.pause();
        return api;
      })
      .catch(fail);
    return loading;
  }

  function setMode(mode, { save = true } = {}) {
    html.dataset.mode = mode;
    if (save) store.set("kz-mode", mode);
    const inTunnel = mode === "tunnel";
    modeToggle.textContent = inTunnel ? "Page view" : "Tunnel view";
    skip.textContent = inTunnel ? "Read the page view" : "Skip to content";
    if (inTunnel) {
      window.scrollTo(0, 0);
      if (tunnel) tunnel.resume();
      else loadTunnel();
    } else if (tunnel) {
      tunnel.pause();
    }
  }

  modeToggle.addEventListener("click", () => {
    const next = html.dataset.mode === "tunnel" ? "page" : "tunnel";
    setMode(next);
    if (next === "page") content.focus({ preventScroll: true });
  });
  document.querySelectorAll("[data-enter-tunnel]").forEach((b) =>
    b.addEventListener("click", () => setMode("tunnel")),
  );
  skip.addEventListener("click", (e) => {
    if (html.dataset.mode !== "tunnel") return;
    e.preventDefault();
    setMode("page");
    content.focus();
  });
  mark.addEventListener("click", (e) => {
    e.preventDefault();
    if (html.dataset.mode === "tunnel" && tunnel) tunnel.reset();
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });
  // Deep links (#contact and friends) always land in the page view.
  window.addEventListener("hashchange", () => {
    if (location.hash.length > 1 && html.dataset.mode === "tunnel") setMode("page", { save: false });
  });

  setMode(html.dataset.mode === "tunnel" ? "tunnel" : "page", { save: false });
}

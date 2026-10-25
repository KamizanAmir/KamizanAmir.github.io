// The on-screen analog stick for touch screens. Reads -1..1 on both axes,
// with y positive when pushed up (forward).

const DEAD = 0.12;

export function createJoystick(el) {
  const knob = el.querySelector(".stick-knob");
  const state = { x: 0, y: 0, active: false };
  let id = null;
  let cx = 0;
  let cy = 0;
  let reach = 1;

  function move(e) {
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > reach) {
      dx *= reach / d;
      dy *= reach / d;
    }
    knob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    // Rescale past the dead zone so small pushes still start from zero.
    const m = Math.min(d / reach, 1);
    const k = m < DEAD ? 0 : (m - DEAD) / (1 - DEAD) / (m || 1);
    state.x = (dx / reach) * k;
    state.y = (-dy / reach) * k;
  }

  function end(e) {
    if (e.pointerId !== id) return;
    id = null;
    state.x = state.y = 0;
    state.active = false;
    knob.style.transform = "";
    el.classList.remove("on");
  }

  el.addEventListener("pointerdown", (e) => {
    if (id !== null) return;
    id = e.pointerId;
    el.setPointerCapture(id);
    const r = el.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    reach = r.width * 0.32;
    state.active = true;
    el.classList.add("on");
    move(e);
    e.preventDefault();
  });
  el.addEventListener("pointermove", (e) => {
    if (e.pointerId === id) move(e);
  });
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("lostpointercapture", end);

  return {
    state,
    release() {
      if (id !== null) end({ pointerId: id });
    },
  };
}

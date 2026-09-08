// Pure combat rules, shared by the renderer and the regression checks.
export const WAVES = [
  {
    name: "INTEGRATION / BREAK THE BOTTLENECKS",
    count: 5,
    health: 2,
    speed: 1.2,
  },
  { name: "MOBILITY / KEEP THINGS MOVING", count: 7, health: 3, speed: 1.65 },
  {
    name: "INFRASTRUCTURE / SHIP UNDER PRESSURE",
    count: 9,
    health: 4,
    speed: 1.85,
  },
];
export const COOLDOWNS = { attack: 0.6, dash: 3, shield: 7 };
export function freshState() {
  return {
    mode: "ready",
    wave: 0,
    hp: 100,
    score: 0,
    time: 0,
    invulnerable: 0,
    shieldUntil: 0,
    dashUntil: 0,
    readyAt: { attack: 0, dash: 0, shield: 0 },
  };
}
export function useAbility(state, name) {
  if (
    state.mode !== "playing" ||
    !(name in COOLDOWNS) ||
    state.time < state.readyAt[name]
  )
    return false;
  state.readyAt[name] = state.time + COOLDOWNS[name];
  if (name === "shield") state.shieldUntil = state.time + 2;
  if (name === "dash") {
    state.dashUntil = state.time + 0.22;
    state.invulnerable = Math.max(state.invulnerable, state.time + 0.35);
  }
  return true;
}
export function damagePlayer(state) {
  if (
    state.mode !== "playing" ||
    state.time < state.invulnerable ||
    state.time < state.shieldUntil
  )
    return false;
  state.hp = Math.max(0, state.hp - 12);
  state.invulnerable = state.time + 0.8;
  if (state.hp === 0) state.mode = "lost";
  return true;
}
export function clearWave(state) {
  state.score += 500;
  state.hp = Math.min(100, state.hp + 25);
  if (state.wave === WAVES.length - 1) state.mode = "won";
  else {
    state.wave++;
    state.mode = "between";
  }
}

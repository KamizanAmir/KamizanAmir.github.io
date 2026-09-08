import test from "node:test";
import assert from "node:assert/strict";
import {
  freshState,
  useAbility,
  damagePlayer,
  clearWave,
} from "../portfolio/game-state.js";

test("abilities cannot fire before play or during pause; cooldowns are independent", () => {
  const state = freshState();
  assert.equal(useAbility(state, "attack"), false);
  state.mode = "playing";
  assert.equal(useAbility(state, "attack"), true);
  assert.equal(useAbility(state, "attack"), false);
  assert.equal(useAbility(state, "dash"), true);
  state.time = 0.6;
  assert.equal(useAbility(state, "attack"), true);
  assert.equal(useAbility(state, "dash"), false);
  state.mode = "paused";
  assert.equal(useAbility(state, "shield"), false);
});

test("shield and dash prevent damage only for their protection windows", () => {
  const state = freshState();
  state.mode = "playing";
  useAbility(state, "shield");
  state.time = 1.99;
  assert.equal(damagePlayer(state), false);
  state.time = 2;
  assert.equal(damagePlayer(state), true);
  assert.equal(state.hp, 88);
  assert.equal(damagePlayer(state), false);
  state.time = 3;
  useAbility(state, "dash");
  assert.equal(damagePlayer(state), false);
  state.time = 3.36;
  assert.equal(damagePlayer(state), true);
});

test("contact damage ends the run at zero and cannot go negative", () => {
  const state = freshState();
  state.mode = "playing";
  for (let i = 0; i < 9; i++) {
    state.time = i;
    damagePlayer(state);
  }
  assert.equal(state.hp, 0);
  assert.equal(state.mode, "lost");
  assert.equal(damagePlayer(state), false);
});

test("three cleared waves award bonuses, heal, and finish the run", () => {
  const state = freshState();
  state.mode = "playing";
  state.hp = 60;
  clearWave(state);
  assert.equal(state.wave, 1);
  assert.equal(state.hp, 85);
  assert.equal(state.mode, "between");
  state.mode = "playing";
  clearWave(state);
  assert.equal(state.hp, 100);
  assert.equal(state.wave, 2);
  state.mode = "playing";
  clearWave(state);
  assert.equal(state.mode, "won");
  assert.equal(state.score, 1500);
  assert.equal(freshState().score, 0);
  assert.equal(freshState().hp, 100);
});

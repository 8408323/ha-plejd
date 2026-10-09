// Validation logic behind the dashboard's forms (frontend/src/logic.ts), run with `node --test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBinding, buildSchedule, clampPosition, stepTemperature } from "../frontend/src/logic.ts";

const UP = { device_id: "r1", type: "dim_up" };
const DOWN = { device_id: "r1", type: "dim_down" };
const STOP = { device_id: "r1", type: "release" };
const TRIGGERS = [UP, DOWN, STOP];
const form = (patch) => ({ target: "light:light.hall", device: "r1", up: "", down: "", stop: "", presses: [], ...patch });
const press = (patch) => ({ trigger: "", type: "", entity_id: "", domain: "", service: "", data: "", ...patch });

test("dim binding carries up/down/stop and the light target", () => {
  assert.deepEqual(buildBinding(form({ up: "0", down: "1", stop: "2" }), TRIGGERS), {
    targets: { entity_id: ["light.hall"] },
    up: UP,
    down: DOWN,
    stop: STOP,
  });
});

test("dimming without a release trigger is rejected", () => {
  assert.throws(() => buildBinding(form({ up: "0" }), TRIGGERS), /release \(stop\)/);
});

test("scene and service presses need no target; toggle does", () => {
  const scene = form({ target: "", presses: [press({ trigger: "0", type: "scene", entity_id: "scene.movie" })] });
  assert.deepEqual(buildBinding(scene, TRIGGERS), {
    presses: [{ trigger: UP, action: { type: "scene", entity_id: "scene.movie" } }],
  });
  const toggle = form({ target: "", presses: [press({ trigger: "0", type: "toggle" })] });
  assert.throws(() => buildBinding(toggle, TRIGGERS), /light or room/);
});

test("an untouched press row is skipped, a half-filled one is an error", () => {
  assert.throws(() => buildBinding(form({ presses: [press()] }), TRIGGERS), /dim up\/down trigger or add/);
  assert.throws(() => buildBinding(form({ presses: [press({ type: "on" })] }), TRIGGERS), /Press action 1: pick a trigger/);
});

test("service data must be a JSON object", () => {
  const svc = (data) => form({ presses: [press({ trigger: "0", type: "service", domain: "light", service: "turn_on", data })] });
  assert.throws(() => buildBinding(svc("{"), TRIGGERS), /valid JSON/);
  assert.throws(() => buildBinding(svc("[1]"), TRIGGERS), /JSON object/);
  assert.deepEqual(buildBinding(svc('{"brightness": 50}'), TRIGGERS).presses[0].action, {
    type: "service",
    domain: "light",
    service: "turn_on",
    data: { brightness: 50 },
  });
});

test("a stray stop trigger is dropped from a press-only binding", () => {
  const b = buildBinding(form({ stop: "2", presses: [press({ trigger: "0", type: "on" })] }), TRIGGERS);
  assert.equal("stop" in b, false);
});

test("schedule form is validated and normalized", () => {
  const ok = { name: " Evening ", days: [6, 0], time: "18:30", scene: "3", fade: "" };
  assert.deepEqual(buildSchedule(ok), { name: "Evening", days: [0, 6], time: "18:30", scene: 3, fade: 0 });
  assert.throws(() => buildSchedule({ ...ok, days: [] }), /at least one day/);
  assert.throws(() => buildSchedule({ ...ok, scene: "" }), /Pick a scene/);
  assert.throws(() => buildSchedule({ ...ok, fade: "1.5" }), /whole number/);
});

test("cover positions outside 0-100 or blank are clamped or unknown", () => {
  assert.equal(clampPosition(150), 100);
  assert.equal(clampPosition("-3"), 0);
  assert.equal(clampPosition("  "), null);
  assert.equal(clampPosition("abc"), null);
  assert.equal(clampPosition(undefined), null);
});

test("thermostat steps respect step size and limits", () => {
  assert.equal(stepTemperature(21, 1, { target_temp_step: 0.5 }), 21.5);
  assert.equal(stepTemperature(30, 1, { max_temp: 30 }), 30);
  assert.equal(stepTemperature(5, -1, { min_temp: 5 }), 5);
});

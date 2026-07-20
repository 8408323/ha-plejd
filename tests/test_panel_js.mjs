import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const PANEL_PATH = path.resolve(
  process.env.PANEL_PATH || path.join("custom_components", "plejd", "frontend", "panel.js"),
);

function loadPanelClass(globals = {}) {
  const source = fs.readFileSync(PANEL_PATH, "utf8");
  let PanelClass;
  const context = {
    console,
    setTimeout,
    clearTimeout,
    HTMLElement: class {},
    customElements: {
      define(_name, ctor) {
        PanelClass = ctor;
      },
    },
    ...globals,
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: PANEL_PATH });
  return PanelClass;
}

// Objects built inside the vm sandbox have a different Object/Array prototype than this
// test file's realm, so assert.deepEqual (strict, prototype-sensitive) reports them as
// unequal even with identical own properties. Round-trip through JSON to compare by value.
const plain = (v) => JSON.parse(JSON.stringify(v));

test("_save clears a stale notice before the in-flight render", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const renders = [];
  let resolveSave;

  panel._notice = "Saved.";
  panel._renderEditor = () => {
    renders.push({ busy: panel._busy, notice: panel._notice, error: panel._error });
  };
  panel._callWS = () =>
    new Promise((resolve) => {
      resolveSave = resolve;
    });

  const save = panel._save([{ id: "binding-1" }]);

  assert.deepEqual(renders[0], { busy: true, notice: "", error: "" });

  resolveSave({ bindings: [] });
  await save;

  assert.equal(panel._notice, "Saved.");
});

test("hass updates coalesce lights and scenes renders to one animation frame", () => {
  const frames = [];
  const PanelClass = loadPanelClass({
    requestAnimationFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelAnimationFrame() {},
  });
  const panel = new PanelClass();
  let shells = 0;
  let loads = 0;
  let lights = 0;
  let motion = 0;
  let scenes = 0;
  let health = 0;

  panel._renderShell = () => {
    shells += 1;
  };
  panel._loadBindings = () => {
    loads += 1;
  };
  panel._loadSchedules = () => {};
  panel._updateLights = () => {
    lights += 1;
  };
  panel._updateMotion = () => {
    motion += 1;
  };
  panel._updateScenes = () => {
    scenes += 1;
  };
  panel._updateHealth = () => {
    health += 1;
  };

  panel.hass = { states: {} };
  panel.hass = { states: {} };
  panel.hass = { states: {} };

  assert.equal(shells, 1);
  assert.equal(loads, 1);
  assert.equal(frames.length, 1);
  assert.equal(lights, 0);
  assert.equal(motion, 0);
  assert.equal(scenes, 0);
  assert.equal(health, 0);

  frames.shift()();
  assert.equal(lights, 1);
  assert.equal(motion, 1);
  assert.equal(scenes, 1);
  assert.equal(health, 1);

  panel.hass = { states: {} };
  assert.equal(frames.length, 1);
});

test("disconnect cancels a queued lights render", () => {
  const cancelled = [];
  const PanelClass = loadPanelClass({
    requestAnimationFrame() {
      return 42;
    },
    cancelAnimationFrame(frame) {
      cancelled.push(frame);
    },
  });
  const panel = new PanelClass();

  panel._renderShell = () => {};
  panel._loadBindings = () => {};
  panel._loadSchedules = () => {};
  panel._updateLights = () => {};
  panel._updateMotion = () => {};
  panel._updateHealth = () => {};
  panel.hass = { states: {} };
  panel.disconnectedCallback();

  assert.deepEqual(cancelled, [42]);
  assert.equal(panel._lightsFrame, null);
});

test("disconnect cancels a queued setTimeout fallback when requestAnimationFrame is unavailable", () => {
  const cancelled = [];
  const PanelClass = loadPanelClass({
    setTimeout() {
      return 7;
    },
    clearTimeout(frame) {
      cancelled.push(frame);
    },
  });
  const panel = new PanelClass();

  panel._renderShell = () => {};
  panel._loadBindings = () => {};
  panel._loadSchedules = () => {};
  panel._updateLights = () => {};
  panel._updateMotion = () => {};
  panel._updateHealth = () => {};
  panel.hass = { states: {} };
  panel.disconnectedCallback();

  assert.deepEqual(cancelled, [7]);
  assert.equal(panel._lightsFrame, null);
});

test("_updateLights renders the current Plejd lights list", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const lights = { innerHTML: "" };

  panel.querySelector = (selector) => (selector === "#plejd-lights" ? lights : null);
  panel._hass = {
    states: {
      "light.kitchen": {
        entity_id: "light.kitchen",
        state: "on",
        attributes: { friendly_name: "Kitchen <Main>", brightness: 128 },
      },
      "light.patio": {
        entity_id: "light.patio",
        state: "off",
        attributes: { friendly_name: "Patio" },
      },
      "light.other": {
        entity_id: "light.other",
        state: "on",
        attributes: { friendly_name: "Other vendor" },
      },
    },
    entities: {
      "light.kitchen": { platform: "plejd" },
      "light.patio": { platform: "plejd" },
      "light.other": { platform: "other" },
    },
  };

  panel._updateLights();

  assert.match(lights.innerHTML, />2<\/span>/);
  assert.match(lights.innerHTML, /Kitchen &lt;Main&gt;/);
  assert.match(lights.innerHTML, /50%/);
  assert.match(lights.innerHTML, /Patio/);
  assert.doesNotMatch(lights.innerHTML, /Other vendor/);
});

// ── climate ──────────────────────────────────────────────────────────────────

test("_updateLights also refreshes the climate section on the same coalesced pass", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const lights = { innerHTML: "" };
  const climate = { innerHTML: "", querySelectorAll: () => [] };

  panel.querySelector = (selector) =>
    selector === "#plejd-lights" ? lights : selector === "#plejd-climate" ? climate : null;
  panel._hass = {
    states: {
      "climate.living_room": {
        entity_id: "climate.living_room",
        state: "heat",
        attributes: { friendly_name: "Living Room", current_temperature: 21, temperature: 21.5 },
      },
    },
    entities: { "climate.living_room": { platform: "plejd" } },
  };

  panel._updateLights();

  assert.match(climate.innerHTML, /Living Room/);
  assert.match(climate.innerHTML, /21.5°C/);
});

test("_updateClimate renders the current Plejd thermostats list", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const climate = { innerHTML: "", querySelectorAll: () => [] };

  panel.querySelector = (selector) => (selector === "#plejd-climate" ? climate : null);
  panel._hass = {
    states: {
      "climate.living_room": {
        entity_id: "climate.living_room",
        state: "heat",
        attributes: { friendly_name: "Living Room <TRM>", current_temperature: 21, temperature: 21.5 },
      },
      "climate.hallway": {
        entity_id: "climate.hallway",
        state: "heat",
        attributes: { friendly_name: "Hallway" },
      },
      "climate.other": {
        entity_id: "climate.other",
        state: "heat",
        attributes: { friendly_name: "Other vendor" },
      },
    },
    entities: {
      "climate.living_room": { platform: "plejd" },
      "climate.hallway": { platform: "plejd" },
      "climate.other": { platform: "other" },
    },
  };

  panel._updateClimate();

  assert.match(climate.innerHTML, />2<\/span>/);
  assert.match(climate.innerHTML, /Living Room &lt;TRM&gt;/);
  assert.match(climate.innerHTML, /21.5°C/);
  assert.match(climate.innerHTML, /Hallway/);
  assert.match(climate.innerHTML, /disabled/); // Hallway has no target reading yet
  assert.doesNotMatch(climate.innerHTML, /Other vendor/);
});

test("_updateClimate renders a placeholder and does not crash with no Plejd thermostats", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const climate = { innerHTML: "", querySelectorAll: () => [] };
  panel.querySelector = (selector) => (selector === "#plejd-climate" ? climate : null);
  panel._hass = { states: {}, entities: {} };

  panel._updateClimate();

  assert.match(climate.innerHTML, /No Plejd thermostats found/);
});

function makeClimateButton(attrName, attrValue) {
  const listeners = {};
  return {
    getAttribute: (name) => (name === attrName ? attrValue : null),
    addEventListener: (ev, fn) => {
      listeners[ev] = fn;
    },
    fire: (ev) => listeners[ev](),
  };
}

test("tapping + calls climate.set_temperature using the entity's own target_temp_step", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const calls = [];
  panel._callService = (domain, service, data) => {
    calls.push({ domain, service, data });
    return Promise.resolve();
  };
  panel.querySelector = () => null; // no #plejd-climate mounted - the post-tap re-render is a no-op
  const state = {
    entity_id: "climate.living_room",
    attributes: { temperature: 21, target_temp_step: 1 },
  };
  const incBtn = makeClimateButton("data-climate-inc", "climate.living_room");
  const el = { querySelectorAll: (sel) => (sel === "[data-climate-inc]" ? [incBtn] : []) };

  panel._wireClimate(el, [state]);
  incBtn.fire("click");

  assert.deepEqual(plain(calls), [
    {
      domain: "climate",
      service: "set_temperature",
      data: { entity_id: "climate.living_room", temperature: 22 },
    },
  ]);
});

test("tapping - calls climate.set_temperature and falls back to a 0.5° step when unset", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const calls = [];
  panel._callService = (domain, service, data) => {
    calls.push({ domain, service, data });
    return Promise.resolve();
  };
  panel.querySelector = () => null; // no #plejd-climate mounted - the post-tap re-render is a no-op
  const state = { entity_id: "climate.living_room", attributes: { temperature: 21 } };
  const decBtn = makeClimateButton("data-climate-dec", "climate.living_room");
  const el = { querySelectorAll: (sel) => (sel === "[data-climate-dec]" ? [decBtn] : []) };

  panel._wireClimate(el, [state]);
  decBtn.fire("click");

  assert.deepEqual(plain(calls), [
    {
      domain: "climate",
      service: "set_temperature",
      data: { entity_id: "climate.living_room", temperature: 20.5 },
    },
  ]);
});

test("rapid repeated taps accumulate instead of repeating the same step", () => {
  // The entity's own attributes.temperature only reflects a tap after the real
  // round-trip lands - tapping again before that must not recompute from the same
  // pre-tap snapshot each time (two quick + taps from 21°C landing on 21.5°C twice
  // instead of reaching 22°C).
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const calls = [];
  panel._callService = (domain, service, data) => {
    calls.push(data);
    return Promise.resolve();
  };
  panel.querySelector = () => null;
  const state = { entity_id: "climate.living_room", attributes: { temperature: 21, target_temp_step: 0.5 } };
  const incBtn = makeClimateButton("data-climate-inc", "climate.living_room");
  const el = { querySelectorAll: (sel) => (sel === "[data-climate-inc]" ? [incBtn] : []) };
  panel._wireClimate(el, [state]);

  incBtn.fire("click");
  incBtn.fire("click");

  assert.deepEqual(plain(calls), [
    { entity_id: "climate.living_room", temperature: 21.5 },
    { entity_id: "climate.living_room", temperature: 22 },
  ]);
});

test("a failed setpoint tap drops its optimistic override instead of leaving it stuck", async () => {
  const PanelClass = loadPanelClass({ console: { ...console, warn: () => {} } });
  const panel = new PanelClass();
  panel._callService = () => Promise.reject(new Error("boom"));
  panel.querySelector = () => null;
  panel._climateOverrides = { "climate.living_room": 22 };

  await panel._stepClimate({ entity_id: "climate.living_room", attributes: { temperature: 21 } }, 1);

  assert.deepEqual(panel._climateOverrides, {});
});

test("_updateClimate renders a pending setpoint override immediately", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const climate = { innerHTML: "", querySelectorAll: () => [] };
  panel.querySelector = (selector) => (selector === "#plejd-climate" ? climate : null);
  panel._hass = {
    states: {
      "climate.living_room": {
        entity_id: "climate.living_room",
        state: "heat",
        attributes: { friendly_name: "Living Room", temperature: 21 },
      },
    },
    entities: { "climate.living_room": { platform: "plejd" } },
  };
  panel._climateOverrides = { "climate.living_room": 21.5 }; // we just tapped + but hass hasn't caught up

  panel._updateClimate();

  assert.match(climate.innerHTML, /21.5°C/);
  assert.doesNotMatch(climate.innerHTML, />21°C</);
  assert.deepEqual(panel._climateOverrides, { "climate.living_room": 21.5 }); // not confirmed yet
});

test("_stepClimate clamps the next target to the entity's min/max_temp", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const calls = [];
  panel._callService = (domain, service, data) => {
    calls.push(data);
    return Promise.resolve();
  };

  panel._stepClimate(
    { entity_id: "climate.attic_hot", attributes: { temperature: 34.5, target_temp_step: 0.5, max_temp: 35 } },
    1,
  );
  panel._stepClimate(
    { entity_id: "climate.attic_cold", attributes: { temperature: 5.2, target_temp_step: 0.5, min_temp: 5 } },
    -1,
  );

  assert.deepEqual(plain(calls), [
    { entity_id: "climate.attic_hot", temperature: 35 },
    { entity_id: "climate.attic_cold", temperature: 5 },
  ]);
});

test("_stepClimate is a no-op when the thermostat has no target temperature yet", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  let called = false;
  panel._callService = () => {
    called = true;
    return Promise.resolve();
  };

  panel._stepClimate({ entity_id: "climate.x", attributes: {} }, 1);
  panel._stepClimate(null, 1);

  assert.equal(called, false);
});

// ── motion & illuminance ─────────────────────────────────────────────────────

test("_updateMotion lists each motion sensor with its device name, state, and illuminance", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const motion = { innerHTML: "" };

  panel.querySelector = (selector) => (selector === "#plejd-motion" ? motion : null);
  panel._hass = {
    states: {
      "binary_sensor.hallway_motion": {
        entity_id: "binary_sensor.hallway_motion",
        state: "on",
        attributes: { friendly_name: "Hallway Motion", device_class: "motion" },
      },
      "sensor.hallway_illuminance": {
        entity_id: "sensor.hallway_illuminance",
        state: "42",
        attributes: { friendly_name: "Hallway Illuminance", device_class: "illuminance" },
      },
      "binary_sensor.garage_motion": {
        entity_id: "binary_sensor.garage_motion",
        state: "off",
        attributes: { friendly_name: "Garage Motion", device_class: "motion" },
      },
      "binary_sensor.other_vendor_motion": {
        entity_id: "binary_sensor.other_vendor_motion",
        state: "on",
        attributes: { friendly_name: "Other vendor motion", device_class: "motion" },
      },
    },
    entities: {
      "binary_sensor.hallway_motion": { platform: "plejd", device_id: "dev.hallway" },
      "sensor.hallway_illuminance": { platform: "plejd", device_id: "dev.hallway" },
      "binary_sensor.garage_motion": { platform: "plejd", device_id: "dev.garage" },
      "binary_sensor.other_vendor_motion": { platform: "other" },
    },
    devices: { "dev.hallway": { name: "Hallway" }, "dev.garage": { name: "Garage" } },
  };

  panel._updateMotion();

  assert.match(motion.innerHTML, />2<\/span>/);
  assert.match(motion.innerHTML, /Hallway/);
  assert.match(motion.innerHTML, /Detected/);
  assert.match(motion.innerHTML, /42 lx/);
  assert.match(motion.innerHTML, /Garage/);
  assert.match(motion.innerHTML, /Clear/);
  assert.doesNotMatch(motion.innerHTML, /Other vendor motion/);
});

test("_updateMotion omits the illuminance reading when the paired sensor is unavailable", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const motion = { innerHTML: "" };

  panel.querySelector = (selector) => (selector === "#plejd-motion" ? motion : null);
  panel._hass = {
    states: {
      "binary_sensor.hallway_motion": {
        entity_id: "binary_sensor.hallway_motion",
        state: "on",
        attributes: { friendly_name: "Hallway Motion", device_class: "motion" },
      },
      "sensor.hallway_illuminance": {
        entity_id: "sensor.hallway_illuminance",
        state: "unavailable",
        attributes: { friendly_name: "Hallway Illuminance", device_class: "illuminance" },
      },
    },
    entities: {
      "binary_sensor.hallway_motion": { platform: "plejd", device_id: "dev.hallway" },
      "sensor.hallway_illuminance": { platform: "plejd", device_id: "dev.hallway" },
    },
    devices: { "dev.hallway": { name: "Hallway" } },
  };

  panel._updateMotion();

  assert.match(motion.innerHTML, /Detected/);
  assert.doesNotMatch(motion.innerHTML, /lx/);
});

test("_updateMotion falls back to the entity's friendly name when no device_id is registered", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const motion = { innerHTML: "" };

  panel.querySelector = (selector) => (selector === "#plejd-motion" ? motion : null);
  panel._hass = {
    states: {
      "binary_sensor.attic_motion": {
        entity_id: "binary_sensor.attic_motion",
        state: "off",
        attributes: { friendly_name: "Attic Motion", device_class: "motion", attribution: "Plejd" },
      },
    },
    entities: {},
  };

  panel._updateMotion();

  assert.match(motion.innerHTML, /Attic Motion/);
  assert.match(motion.innerHTML, /Clear/);
});

test("_updateMotion reports unavailable and unknown motion sensors distinctly from clear", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const motion = { innerHTML: "" };

  panel.querySelector = (selector) => (selector === "#plejd-motion" ? motion : null);
  panel._hass = {
    states: {
      "binary_sensor.hallway_motion": {
        entity_id: "binary_sensor.hallway_motion",
        state: "unavailable",
        attributes: { friendly_name: "Hallway Motion", device_class: "motion" },
      },
      "binary_sensor.garage_motion": {
        entity_id: "binary_sensor.garage_motion",
        state: "unknown",
        attributes: { friendly_name: "Garage Motion", device_class: "motion" },
      },
    },
    entities: {
      "binary_sensor.hallway_motion": { platform: "plejd", device_id: "dev.hallway" },
      "binary_sensor.garage_motion": { platform: "plejd", device_id: "dev.garage" },
    },
    devices: { "dev.hallway": { name: "Hallway" }, "dev.garage": { name: "Garage" } },
  };

  panel._updateMotion();

  assert.equal((motion.innerHTML.match(/Unavailable/g) || []).length, 2);
  assert.doesNotMatch(motion.innerHTML, /Clear/);
  assert.doesNotMatch(motion.innerHTML, /Detected/);
});

test("_updateMotion does not crash on a site with no motion sensors", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const motion = { innerHTML: "" };

  panel.querySelector = (selector) => (selector === "#plejd-motion" ? motion : null);
  panel._hass = { states: {} };

  panel._updateMotion();

  assert.match(motion.innerHTML, /No motion sensors found/);
});

test("_updateMotion is a no-op when the panel DOM isn't mounted yet", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();

  panel.querySelector = () => null;
  panel._hass = { states: {} };

  assert.doesNotThrow(() => panel._updateMotion());
});

// ── scenes ───────────────────────────────────────────────────────────────────

test("_updateScenes renders the site's Plejd scenes with an Activate button each", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const scenes = { innerHTML: "", querySelectorAll: () => [] };

  panel.querySelector = (selector) => (selector === "#plejd-scenes" ? scenes : null);
  panel._hass = {
    states: {
      "scene.movie_night": {
        entity_id: "scene.movie_night",
        state: "scening",
        attributes: { friendly_name: "Movie Night" },
      },
      "scene.good_morning": {
        entity_id: "scene.good_morning",
        state: "scening",
        attributes: { friendly_name: "Good Morning" },
      },
      "scene.other_vendor": {
        entity_id: "scene.other_vendor",
        state: "scening",
        attributes: { friendly_name: "Other vendor scene" },
      },
    },
    entities: {
      "scene.movie_night": { platform: "plejd" },
      "scene.good_morning": { platform: "plejd" },
      "scene.other_vendor": { platform: "other" },
    },
  };

  panel._updateScenes();

  assert.match(scenes.innerHTML, />2<\/span>/);
  assert.match(scenes.innerHTML, /Good Morning/);
  assert.match(scenes.innerHTML, /Movie Night/);
  assert.doesNotMatch(scenes.innerHTML, /Other vendor scene/);
  assert.match(scenes.innerHTML, /data-activate-scene="scene\.good_morning"/);
  assert.match(scenes.innerHTML, />Activate</);
});

test("_updateScenes renders an empty state for a site with no Plejd scenes", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const scenes = { innerHTML: "", querySelectorAll: () => [] };

  panel.querySelector = (selector) => (selector === "#plejd-scenes" ? scenes : null);
  panel._hass = { states: {}, entities: {} };

  panel._updateScenes();

  assert.match(scenes.innerHTML, />0<\/span>/);
  assert.match(scenes.innerHTML, /No Plejd scenes found\./);
  assert.doesNotMatch(scenes.innerHTML, /data-activate-scene/);
});

test("clicking Activate on a scene row calls scene.turn_on with that scene's entity_id", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const listeners = {};
  const activateBtn = {
    getAttribute: () => "scene.movie_night",
    addEventListener: (ev, fn) => {
      listeners[ev] = fn;
    },
  };
  const scenes = { innerHTML: "", querySelectorAll: () => [activateBtn] };

  panel.querySelector = (selector) => (selector === "#plejd-scenes" ? scenes : null);
  panel._hass = {
    states: {
      "scene.movie_night": {
        entity_id: "scene.movie_night",
        state: "scening",
        attributes: { friendly_name: "Movie Night" },
      },
    },
    entities: { "scene.movie_night": { platform: "plejd" } },
  };
  let called;
  panel._callService = (domain, service, data) => {
    called = { domain, service, data };
    return Promise.resolve();
  };

  panel._updateScenes();
  const activated = listeners.click();

  return activated.then(() => {
    assert.deepEqual(plain(called), {
      domain: "scene",
      service: "turn_on",
      data: { entity_id: "scene.movie_night" },
    });
  });
});

test("a failed scene activation surfaces an error without throwing", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._hass = { states: {}, entities: {} };
  panel._updateScenes = () => {};
  panel._callService = () => Promise.reject(new Error("service unavailable"));

  await panel._activateScene("scene.movie_night");

  assert.match(panel._scenesError, /service unavailable/);
});

// ── device health ────────────────────────────────────────────────────────────

test("_updateHealth shows an all-healthy state when no fault sensor is active", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const health = { innerHTML: "" };

  panel.querySelector = (selector) => (selector === "#plejd-health" ? health : null);
  panel._hass = {
    states: {
      "binary_sensor.kitchen_dimmer_fault": {
        entity_id: "binary_sensor.kitchen_dimmer_fault",
        state: "off",
        attributes: { friendly_name: "Kitchen dimmer Fault", device_class: "problem", active_faults: [] },
      },
    },
    entities: {
      "binary_sensor.kitchen_dimmer_fault": { platform: "plejd", device_id: "dev.kitchen" },
    },
    devices: { "dev.kitchen": { name: "Kitchen dimmer" } },
  };

  panel._updateHealth();

  assert.match(health.innerHTML, /All devices healthy/);
  assert.match(health.innerHTML, />0<\/span>/);
  assert.doesNotMatch(health.innerHTML, /Kitchen dimmer/);
});

test("_updateHealth lists each faulted device with its name and active fault flags", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const health = { innerHTML: "" };

  panel.querySelector = (selector) => (selector === "#plejd-health" ? health : null);
  panel._hass = {
    states: {
      "binary_sensor.kitchen_dimmer_fault": {
        entity_id: "binary_sensor.kitchen_dimmer_fault",
        state: "on",
        attributes: {
          friendly_name: "Kitchen dimmer Fault",
          device_class: "problem",
          active_faults: ["overtemperature", "soft_overcurrent"],
        },
      },
      "binary_sensor.hall_switch_fault": {
        entity_id: "binary_sensor.hall_switch_fault",
        state: "off",
        attributes: { friendly_name: "Hall switch Fault", device_class: "problem", active_faults: [] },
      },
      "binary_sensor.other_vendor_problem": {
        entity_id: "binary_sensor.other_vendor_problem",
        state: "on",
        attributes: { friendly_name: "Other vendor problem", device_class: "problem" },
      },
    },
    entities: {
      "binary_sensor.kitchen_dimmer_fault": { platform: "plejd", device_id: "dev.kitchen" },
      "binary_sensor.hall_switch_fault": { platform: "plejd", device_id: "dev.hall" },
      "binary_sensor.other_vendor_problem": { platform: "other" },
    },
    devices: { "dev.kitchen": { name: "Kitchen dimmer" }, "dev.hall": { name: "Hall switch" } },
  };

  panel._updateHealth();

  assert.match(health.innerHTML, />1<\/span>/);
  assert.match(health.innerHTML, /Kitchen dimmer/);
  assert.match(health.innerHTML, /overtemperature/);
  assert.match(health.innerHTML, /soft overcurrent/);
  assert.doesNotMatch(health.innerHTML, /Hall switch/); // not faulted, so not listed
  assert.doesNotMatch(health.innerHTML, /Other vendor problem/); // not our platform
  assert.doesNotMatch(health.innerHTML, /All devices healthy/);
});

test("_updateHealth falls back to the entity's friendly name when no device_id is registered", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const health = { innerHTML: "" };

  panel.querySelector = (selector) => (selector === "#plejd-health" ? health : null);
  panel._hass = {
    states: {
      "binary_sensor.gateway_fault": {
        entity_id: "binary_sensor.gateway_fault",
        state: "on",
        attributes: { friendly_name: "Gateway Fault", device_class: "problem", active_faults: ["hard_fault"] },
      },
    },
    entities: {
      "binary_sensor.gateway_fault": { platform: "plejd" },
    },
    devices: {},
  };

  panel._updateHealth();

  assert.match(health.innerHTML, /Gateway Fault/);
});

test("_updateHealth does not crash on a site with no fault sensors", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const health = { innerHTML: "" };

  panel.querySelector = (selector) => (selector === "#plejd-health" ? health : null);
  panel._hass = { states: {} };

  panel._updateHealth();

  assert.match(health.innerHTML, /All devices healthy/);
});

test("_updateHealth is a no-op when the panel DOM isn't mounted yet", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();

  panel.querySelector = () => null;
  panel._hass = { states: {} };

  assert.doesNotThrow(() => panel._updateHealth());
});

test("deleting a binding preserves an in-progress add form", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._bindings = [{ id: "keep" }, { id: "drop" }];
  panel._renderEditor = () => {};
  let saved;
  panel._callWS = (msg) => {
    saved = msg;
    return Promise.resolve({ bindings: [{ id: "keep" }] });
  };
  const values = { "#f-target": "light:light.a", "#f-device": "dev1", "#f-up": "0", "#f-down": "", "#f-stop": "1" };
  const el = { querySelector: (sel) => (sel in values ? { value: values[sel] } : null) };

  await panel._onDelete(el, "drop");

  assert.deepEqual(saved.bindings, [{ id: "keep" }]); // the deleted binding is dropped
  assert.equal(panel._form.target, "light:light.a"); // the in-progress add form survives
  assert.equal(panel._form.stop, "1");
});

test("adding a binding resets the add form on success", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._renderEditor = () => {};
  panel._form = { target: "light:light.a", device: "dev1", up: "0", down: "", stop: "1" };
  panel._callWS = () => Promise.resolve({ bindings: [{ id: "new" }] });

  await panel._save([{ id: "new" }], true);

  assert.equal(panel._form.target, "");
  assert.equal(panel._form.device, "");
  assert.equal(panel._form.up, "");
  assert.equal(panel._form.down, "");
  assert.equal(panel._form.stop, "");
});

test("first hass assignment loads area and device registries over websocket", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const calls = [];

  panel._renderShell = () => {};
  panel._loadBindings = () => {};
  panel._loadSchedules = () => {};
  panel._scheduleLightsUpdate = () => {};
  panel._renderEditor = () => {};
  panel._updateMotion = () => {};
  panel._updateHealth = () => {};

  panel.hass = {
    states: {},
    callWS(msg) {
      calls.push(msg.type);
      if (msg.type === "config/area_registry/list") {
        return Promise.resolve([{ area_id: "area.kitchen", name: "Kitchen" }]);
      }
      if (msg.type === "config/device_registry/list") {
        return Promise.resolve([{ id: "dev.remote", name: "Remote Hall" }]);
      }
      throw new Error(`unexpected ws call: ${msg.type}`);
    },
  };

  await panel._registriesPromise;

  assert.deepEqual(calls.sort(), ["config/area_registry/list", "config/device_registry/list"]);
  assert.equal(panel._areas().length, 1);
  assert.equal(panel._areas()[0].id, "area.kitchen");
  assert.equal(panel._areas()[0].name, "Kitchen");
  assert.equal(panel._devices().length, 1);
  assert.equal(panel._devices()[0].id, "dev.remote");
  assert.equal(panel._devices()[0].name, "Remote Hall");
  assert.equal(panel._areaName("area.kitchen"), "Kitchen");
  assert.equal(panel._deviceName("dev.remote"), "Remote Hall");
});

test("registry load refreshes the motion card so a device id placeholder becomes the friendly name", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const motion = { innerHTML: "" };

  panel._renderShell = () => {};
  panel._loadBindings = () => {};
  panel._scheduleLightsUpdate = () => {};
  panel._renderEditor = () => {};
  panel.querySelector = (selector) => (selector === "#plejd-motion" ? motion : null);

  panel.hass = {
    states: {
      "binary_sensor.hallway_motion": {
        entity_id: "binary_sensor.hallway_motion",
        state: "off",
        attributes: { friendly_name: "Hallway Motion", device_class: "motion" },
      },
    },
    entities: {
      "binary_sensor.hallway_motion": { platform: "plejd", device_id: "dev.hallway" },
    },
    // No hass.devices entry yet (registries not pushed to the frontend store): before the
    // registry websocket call resolves, _deviceName falls back to the raw device id.
    devices: {},
    callWS(msg) {
      if (msg.type === "config/area_registry/list") return Promise.resolve([]);
      if (msg.type === "config/device_registry/list") {
        return Promise.resolve([{ id: "dev.hallway", name: "Hallway" }]);
      }
      throw new Error(`unexpected ws call: ${msg.type}`);
    },
  };

  // Simulate the initial motion render (scheduled separately via _scheduleLightsUpdate,
  // stubbed above) happening before the registries resolve.
  panel._updateMotion();
  assert.match(motion.innerHTML, /dev\.hallway/);

  await panel._registriesPromise;

  assert.match(motion.innerHTML, /Hallway/);
  assert.doesNotMatch(motion.innerHTML, /dev\.hallway/);
});

test("registries resolving after the health card's first render refreshes it with device names instead of leaving raw ids", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const health = { innerHTML: "" };

  panel._renderShell = () => {};
  panel._loadBindings = () => {};
  panel._scheduleLightsUpdate = () => {};
  panel.querySelector = (selector) => (selector === "#plejd-health" ? health : null);

  panel.hass = {
    states: {
      "binary_sensor.kitchen_dimmer_fault": {
        entity_id: "binary_sensor.kitchen_dimmer_fault",
        state: "on",
        attributes: { friendly_name: "Kitchen dimmer Fault", device_class: "problem", active_faults: ["overtemperature"] },
      },
    },
    entities: {
      "binary_sensor.kitchen_dimmer_fault": { platform: "plejd", device_id: "dev.kitchen" },
    },
    // No hass.devices exposed yet, mirroring a quiet site where the first health render
    // happens before config/device_registry/list resolves.
    callWS(msg) {
      if (msg.type === "config/area_registry/list") return Promise.resolve([]);
      if (msg.type === "config/device_registry/list") {
        return Promise.resolve([{ id: "dev.kitchen", name: "Kitchen dimmer" }]);
      }
      throw new Error(`unexpected ws call: ${msg.type}`);
    },
  };

  // Simulate the scheduled health render firing before the registries promise settles.
  panel._updateHealth();
  assert.match(health.innerHTML, /dev\.kitchen/); // raw device id, not yet a name

  await panel._registriesPromise;

  assert.doesNotMatch(health.innerHTML, /dev\.kitchen/);
  assert.match(health.innerHTML, /Kitchen dimmer/);
});

test("trigger change listeners keep _form in sync so re-renders preserve selections", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();

  const listeners = {};
  function makeSelect(id) {
    const el = {
      value: "",
      addEventListener(ev, fn) {
        listeners[id] = listeners[id] || {};
        listeners[id][ev] = fn;
      },
    };
    return el;
  }

  const upEl = makeSelect("f-up");
  const downEl = makeSelect("f-down");
  const stopEl = makeSelect("f-stop");

  const el = {
    querySelectorAll: () => [],
    querySelector(sel) {
      if (sel === "#f-up") return upEl;
      if (sel === "#f-down") return downEl;
      if (sel === "#f-stop") return stopEl;
      return null;
    },
  };

  panel._wire(el);

  upEl.value = "1";
  listeners["f-up"].change({ target: upEl });
  downEl.value = "2";
  listeners["f-down"].change({ target: downEl });
  stopEl.value = "3";
  listeners["f-stop"].change({ target: stopEl });

  assert.equal(panel._form.up, "1");
  assert.equal(panel._form.down, "2");
  assert.equal(panel._form.stop, "3");
});

test("registry loading failure keeps registries empty and logs a warning", async () => {
  const warnings = [];
  const PanelClass = loadPanelClass({
    console: { ...console, warn: (...args) => warnings.push(args) },
  });
  const panel = new PanelClass();

  panel._renderShell = () => {};
  panel._loadBindings = () => {};
  panel._loadSchedules = () => {};
  panel._scheduleLightsUpdate = () => {};
  panel._renderEditor = () => {};
  panel._updateMotion = () => {};
  panel._updateHealth = () => {};

  panel.hass = {
    states: {},
    callWS() {
      return Promise.reject(new Error("boom"));
    },
  };

  await panel._registriesPromise;

  assert.equal(panel._registriesLoaded, false);
  assert.equal(panel._areas().length, 0);
  assert.equal(panel._devices().length, 0);
  assert.equal(warnings.length, 1);
});

test("_targetName lists every target of a multi-target binding", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._hass = {
    states: {
      "light.a": { attributes: { friendly_name: "Light A" } },
      "light.b": { attributes: { friendly_name: "Light B" } },
    },
    areas: { kitchen: { name: "Kitchen" } },
    devices: {},
  };

  const name = panel._targetName({ targets: { entity_id: ["light.a", "light.b"], area_id: ["kitchen"] } });

  assert.equal(name, "Light A, Light B, Kitchen");
});

// ── press actions ────────────────────────────────────────────────────────────

test("_pressRowHtml renders the trigger and action pickers with no extra fields by default", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [{ type: "button_short_press", subtype: "button_1" }] };

  const html = panel._pressRowHtml(
    { trigger: "", type: "", entity_id: "", domain: "", service: "", data: "" },
    0,
  );

  assert.match(html, /id="f-press-trigger-0"/);
  assert.match(html, /id="f-press-type-0"/);
  assert.match(html, /data-remove-press="0"/);
  assert.doesNotMatch(html, /f-press-entity-0/);
  assert.doesNotMatch(html, /f-press-domain-0/);
});

test("_pressRowHtml shows a scene picker restricted to scene.* entities when type is scene", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [] };
  panel._hass = {
    states: {
      "scene.movie_night": { entity_id: "scene.movie_night", attributes: { friendly_name: "Movie Night" } },
      "light.kitchen": { entity_id: "light.kitchen", attributes: { friendly_name: "Kitchen" } },
    },
  };

  const html = panel._pressRowHtml(
    { trigger: "", type: "scene", entity_id: "scene.movie_night", domain: "", service: "", data: "" },
    2,
  );

  assert.match(html, /id="f-press-entity-2"/);
  assert.match(html, /Movie Night/);
  assert.doesNotMatch(html, /Kitchen/);
  assert.match(html, /value="scene\.movie_night"[^>]*selected/);
  assert.doesNotMatch(html, /f-press-domain-2/);
});

test("_pressRowHtml shows domain/service/data fields when type is service", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [] };

  const html = panel._pressRowHtml(
    {
      trigger: "",
      type: "service",
      entity_id: "",
      domain: "light",
      service: "turn_on",
      data: '{"brightness_pct": 50}',
    },
    0,
  );

  assert.match(html, /id="f-press-domain-0"/);
  assert.match(html, /id="f-press-service-0"/);
  assert.match(html, /id="f-press-data-0"/);
  assert.match(html, /value="light"/);
  assert.match(html, /value="turn_on"/);
  assert.match(html, /brightness_pct/);
  assert.doesNotMatch(html, /f-press-entity-0/);
});

test("_pressRowHtml escapes user-controlled service fields", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [] };

  const html = panel._pressRowHtml(
    { trigger: "", type: "service", entity_id: "", domain: "<img src=x>", service: "", data: "" },
    0,
  );

  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test("clicking + Add press action appends an empty row and re-renders", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  let renders = 0;
  panel._renderEditor = () => {
    renders += 1;
  };

  const listeners = {};
  const addBtn = {
    addEventListener: (ev, fn) => {
      listeners.add = fn;
    },
  };
  const el = {
    querySelectorAll: () => [],
    querySelector: (sel) => (sel === "#f-press-add" ? addBtn : null),
  };

  panel._wire(el);
  assert.equal(panel._form.presses.length, 0);

  listeners.add();

  assert.equal(panel._form.presses.length, 1);
  assert.deepEqual(plain(panel._form.presses[0]), {
    trigger: "",
    type: "",
    entity_id: "",
    domain: "",
    service: "",
    data: "",
  });
  assert.equal(renders, 1);
});

test("clicking a press row's remove button removes just that row", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.presses = [
    { trigger: "0", type: "toggle", entity_id: "", domain: "", service: "", data: "" },
    { trigger: "1", type: "on", entity_id: "", domain: "", service: "", data: "" },
  ];
  panel._renderEditor = () => {};

  const listeners = {};
  const removeBtn1 = {
    addEventListener: (ev, fn) => {
      listeners.remove1 = fn;
    },
  };
  const el = {
    querySelectorAll: () => [],
    querySelector: (sel) => (sel === '[data-remove-press="1"]' ? removeBtn1 : null),
  };

  panel._wire(el);
  listeners.remove1();

  assert.equal(panel._form.presses.length, 1);
  assert.equal(panel._form.presses[0].trigger, "0");
});

test("changing a press row's action type re-renders to show its fields", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.presses = [{ trigger: "", type: "", entity_id: "", domain: "", service: "", data: "" }];
  let renders = 0;
  panel._renderEditor = () => {
    renders += 1;
  };

  const listeners = {};
  const typeEl = {
    value: "scene",
    addEventListener: (ev, fn) => {
      listeners.type = fn;
    },
  };
  const el = {
    querySelectorAll: () => [],
    querySelector: (sel) => (sel === "#f-press-type-0" ? typeEl : null),
  };

  panel._wire(el);
  listeners.type({ target: typeEl });

  assert.equal(panel._form.presses[0].type, "scene");
  assert.equal(renders, 1);
});

test("changing the remote clears each press row's trigger index but keeps the rest of the row", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.presses = [{ trigger: "1", type: "toggle", entity_id: "", domain: "", service: "", data: "" }];
  panel._loadTriggers = () => Promise.resolve();
  panel._renderEditor = () => {};

  const listeners = {};
  const deviceEl = {
    value: "dev2",
    addEventListener: (ev, fn) => {
      listeners.change = fn;
    },
  };
  const el = {
    querySelectorAll: () => [],
    querySelector: (sel) => (sel === "#f-device" ? deviceEl : null),
  };

  panel._wire(el);
  await listeners.change({ target: deviceEl });

  assert.equal(panel._form.device, "dev2");
  assert.equal(panel._form.presses[0].trigger, "");
  assert.equal(panel._form.presses[0].type, "toggle");
});

test("_pressesFromForm skips a fully empty press row", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [{ trigger: "", type: "", entity_id: "", domain: "", service: "", data: "" }];

  assert.deepEqual(plain(panel._pressesFromForm()), []);
});

test("_pressesFromForm rejects a press row with an action but no trigger", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [{ trigger: "", type: "toggle", entity_id: "", domain: "", service: "", data: "" }];

  assert.throws(() => panel._pressesFromForm(), /trigger/i);
});

test("_pressesFromForm rejects a scene action with no scene picked", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [{ trigger: "0", type: "scene", entity_id: "", domain: "", service: "", data: "" }];

  assert.throws(() => panel._pressesFromForm(), /scene/i);
});

test("_pressesFromForm rejects a service action missing domain or service", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [
    { trigger: "0", type: "service", entity_id: "", domain: "light", service: "", data: "" },
  ];

  assert.throws(() => panel._pressesFromForm(), /domain and a service/i);
});

test("_pressesFromForm rejects invalid JSON in a service action's data field", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [
    { trigger: "0", type: "service", entity_id: "", domain: "light", service: "turn_on", data: "{not json" },
  ];

  assert.throws(() => panel._pressesFromForm(), /valid JSON/i);
});

test("_pressesFromForm rejects service data that is valid JSON but not an object", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [{ type: "button_short_press" }] };

  for (const data of ['"just a string"', "[1, 2, 3]", "42", "null"]) {
    panel._form.presses = [
      { trigger: "0", type: "service", entity_id: "", domain: "light", service: "turn_on", data },
    ];
    assert.throws(() => panel._pressesFromForm(), /JSON object/i, `data=${data}`);
  }
});

test("_pressesFromForm accepts a JSON object for service data", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [
    {
      trigger: "0",
      type: "service",
      entity_id: "",
      domain: "light",
      service: "turn_on",
      data: '{"brightness_pct": 50}',
    },
  ];

  const presses = plain(panel._pressesFromForm());

  assert.deepEqual(presses[0].action.data, { brightness_pct: 50 });
});

test("_pressesFromForm ignores a stale hidden field on a row the user visibly cleared back to blank", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  // Simulates: user picked "service", typed a domain, then switched the action back to
  // "" (blank) — _readForm preserves the hidden domain value, but the row now looks
  // empty (no trigger, no visible action), so it must be silently skipped, not rejected.
  panel._form.presses = [
    { trigger: "", type: "", entity_id: "", domain: "light", service: "", data: "" },
  ];

  assert.deepEqual(plain(panel._pressesFromForm()), []);
});

test("_pressesFromForm assembles a full set of toggle/scene/service rows", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._form.device = "dev1";
  panel._triggers = {
    dev1: [
      { type: "button_short_press", subtype: "button_1" },
      { type: "button_long_press", subtype: "button_1" },
      { type: "button_short_press", subtype: "button_2" },
    ],
  };
  panel._form.presses = [
    { trigger: "0", type: "toggle", entity_id: "", domain: "", service: "", data: "" },
    { trigger: "1", type: "scene", entity_id: "scene.movie_night", domain: "", service: "", data: "" },
    {
      trigger: "2",
      type: "service",
      entity_id: "",
      domain: "light",
      service: "turn_on",
      data: '{"brightness_pct": 50}',
    },
  ];

  const presses = plain(panel._pressesFromForm());

  assert.deepEqual(presses, [
    { trigger: { type: "button_short_press", subtype: "button_1" }, action: { type: "toggle" } },
    {
      trigger: { type: "button_long_press", subtype: "button_1" },
      action: { type: "scene", entity_id: "scene.movie_night" },
    },
    {
      trigger: { type: "button_short_press", subtype: "button_2" },
      action: { type: "service", domain: "light", service: "turn_on", data: { brightness_pct: 50 } },
    },
  ]);
});

test("_onSave saves a press-only binding without requiring a dim up/down/stop trigger", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._bindings = [];
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [{ trigger: "", type: "", entity_id: "", domain: "", service: "", data: "" }];
  let savedBindings;
  panel._save = (bindings) => {
    savedBindings = bindings;
    return Promise.resolve();
  };

  const values = {
    "#f-target": "light:light.a",
    "#f-device": "dev1",
    "#f-up": "",
    "#f-down": "",
    "#f-stop": "",
    "#f-press-trigger-0": "0",
    "#f-press-type-0": "toggle",
  };
  const el = { querySelector: (sel) => (sel in values ? { value: values[sel] } : null) };

  panel._onSave(el);

  assert.equal(panel._error, "");
  assert.equal(savedBindings.length, 1);
  assert.equal(savedBindings[0].up, undefined);
  assert.equal(savedBindings[0].stop, undefined);
  assert.deepEqual(plain(savedBindings[0].presses), [
    { trigger: { type: "button_short_press" }, action: { type: "toggle" } },
  ]);
});

test("_onSave drops a picked stop trigger when no dim up/down direction is configured", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._bindings = [];
  panel._triggers = { dev1: [{ type: "button_short_press" }, { type: "button_release" }] };
  panel._form.presses = [{ trigger: "", type: "", entity_id: "", domain: "", service: "", data: "" }];
  let savedBindings;
  panel._save = (bindings) => {
    savedBindings = bindings;
    return Promise.resolve();
  };

  const values = {
    "#f-target": "light:light.a",
    "#f-device": "dev1",
    "#f-up": "",
    "#f-down": "",
    "#f-stop": "1", // a release trigger was picked, but no dim up/down direction was
    "#f-press-trigger-0": "0",
    "#f-press-type-0": "toggle",
  };
  const el = { querySelector: (sel) => (sel in values ? { value: values[sel] } : null) };

  panel._onSave(el);

  assert.equal(panel._error, "");
  assert.equal(savedBindings.length, 1);
  // A stray stop trigger with no matching start would still attach plejd.stop_dim and
  // could cancel an unrelated binding's ramp on the same light — must not be saved.
  assert.equal(savedBindings[0].stop, undefined);
  assert.equal(savedBindings[0].up, undefined);
  assert.equal(savedBindings[0].down, undefined);
});

test("_onSave saves a scene-only press binding without requiring a light/room target", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._bindings = [];
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [
    { trigger: "", type: "scene", entity_id: "scene.movie_night", domain: "", service: "", data: "" },
  ];
  let savedBindings;
  panel._save = (bindings) => {
    savedBindings = bindings;
    return Promise.resolve();
  };

  const values = {
    "#f-target": "", // no light/room picked — a scene press ignores the target entirely
    "#f-device": "dev1",
    "#f-up": "",
    "#f-down": "",
    "#f-stop": "",
    "#f-press-trigger-0": "0",
    "#f-press-type-0": "scene",
    "#f-press-entity-0": "scene.movie_night",
  };
  const el = { querySelector: (sel) => (sel in values ? { value: values[sel] } : null) };

  panel._onSave(el);

  assert.equal(panel._error, "");
  assert.equal(savedBindings.length, 1);
  assert.equal(savedBindings[0].targets, undefined);
  assert.deepEqual(plain(savedBindings[0].presses), [
    { trigger: { type: "button_short_press" }, action: { type: "scene", entity_id: "scene.movie_night" } },
  ]);
});

test("_onSave still requires a target for a non-scene press action (e.g. toggle)", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._bindings = [];
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [{ trigger: "", type: "toggle", entity_id: "", domain: "", service: "", data: "" }];
  panel._renderEditor = () => {};
  let saveCalled = false;
  panel._save = () => {
    saveCalled = true;
    return Promise.resolve();
  };

  const values = {
    "#f-target": "",
    "#f-device": "dev1",
    "#f-up": "",
    "#f-down": "",
    "#f-stop": "",
    "#f-press-trigger-0": "0",
    "#f-press-type-0": "toggle",
  };
  const el = { querySelector: (sel) => (sel in values ? { value: values[sel] } : null) };

  panel._onSave(el);

  assert.equal(saveCalled, false);
  assert.match(panel._error, /Pick a light or room/);
});

test("_onSave saves a service press action that supplies its own target in its data, without a light/room picked", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._bindings = [];
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [
    {
      trigger: "",
      type: "service",
      entity_id: "",
      domain: "script",
      service: "turn_on",
      data: '{"entity_id": "script.my_script"}',
    },
  ];
  let savedBindings;
  panel._save = (bindings) => {
    savedBindings = bindings;
    return Promise.resolve();
  };

  const values = {
    "#f-target": "", // no light/room picked — the service call's data already targets it
    "#f-device": "dev1",
    "#f-up": "",
    "#f-down": "",
    "#f-stop": "",
    "#f-press-trigger-0": "0",
    "#f-press-type-0": "service",
    "#f-press-domain-0": "script",
    "#f-press-service-0": "turn_on",
    "#f-press-data-0": '{"entity_id": "script.my_script"}',
  };
  const el = { querySelector: (sel) => (sel in values ? { value: values[sel] } : null) };

  panel._onSave(el);

  assert.equal(panel._error, "");
  assert.equal(savedBindings.length, 1);
  assert.equal(savedBindings[0].targets, undefined);
});

test("_onSave saves a service press action with no target and no self-targeting data (e.g. a targetless service)", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._bindings = [];
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [
    {
      trigger: "",
      type: "service",
      entity_id: "",
      domain: "persistent_notification",
      service: "create",
      data: '{"message": "hi"}',
    },
  ];
  let savedBindings;
  panel._save = (bindings) => {
    savedBindings = bindings;
    return Promise.resolve();
  };

  const values = {
    "#f-target": "", // no light/room picked — persistent_notification.create takes no target
    "#f-device": "dev1",
    "#f-up": "",
    "#f-down": "",
    "#f-stop": "",
    "#f-press-trigger-0": "0",
    "#f-press-type-0": "service",
    "#f-press-domain-0": "persistent_notification",
    "#f-press-service-0": "create",
    "#f-press-data-0": '{"message": "hi"}',
  };
  const el = { querySelector: (sel) => (sel in values ? { value: values[sel] } : null) };

  panel._onSave(el);

  assert.equal(panel._error, "");
  assert.equal(savedBindings.length, 1);
  assert.equal(savedBindings[0].targets, undefined);
});

test("_onSave fails when neither a dim trigger nor any press action is configured", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._bindings = [];
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._renderEditor = () => {};
  let saveCalled = false;
  panel._save = () => {
    saveCalled = true;
    return Promise.resolve();
  };

  const values = {
    "#f-target": "light:light.a",
    "#f-device": "dev1",
    "#f-up": "",
    "#f-down": "",
    "#f-stop": "",
  };
  const el = { querySelector: (sel) => (sel in values ? { value: values[sel] } : null) };

  panel._onSave(el);

  assert.equal(saveCalled, false);
  assert.match(panel._error, /dim up\/down trigger or add at least one press action/);
});

test("_onSave surfaces a press-row validation error via _fail instead of saving", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._bindings = [];
  panel._triggers = { dev1: [{ type: "button_short_press" }] };
  panel._form.presses = [{ trigger: "", type: "", entity_id: "", domain: "", service: "", data: "" }];
  panel._renderEditor = () => {};
  let saveCalled = false;
  panel._save = () => {
    saveCalled = true;
    return Promise.resolve();
  };

  const values = {
    "#f-target": "light:light.a",
    "#f-device": "dev1",
    "#f-up": "",
    "#f-down": "",
    "#f-stop": "",
    "#f-press-trigger-0": "", // no trigger picked, but an action type was
    "#f-press-type-0": "toggle",
  };
  const el = { querySelector: (sel) => (sel in values ? { value: values[sel] } : null) };

  panel._onSave(el);

  assert.equal(saveCalled, false);
  assert.match(panel._error, /pick a trigger/i);
});

test("the bindings list summarizes press actions alongside up/down/stop", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._bindings = [
    {
      id: "b1",
      targets: { entity_id: ["light.a"] },
      up: { device_id: "dev1", type: "x" },
      stop: { device_id: "dev1", type: "y" },
      presses: [
        { trigger: {}, action: { type: "toggle" } },
        { trigger: {}, action: { type: "on" } },
        { trigger: {}, action: { type: "off" } },
      ],
    },
    {
      id: "b2",
      targets: { entity_id: ["light.b"] },
      presses: [{ trigger: { device_id: "dev2" }, action: { type: "toggle" } }],
    },
  ];
  panel._hass = {
    states: {
      "light.a": { entity_id: "light.a", attributes: { friendly_name: "Light A" } },
      "light.b": { entity_id: "light.b", attributes: { friendly_name: "Light B" } },
    },
    areas: {},
    devices: { dev2: { name: "Remote B" } },
  };
  const bindingsEl = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  panel.querySelector = (sel) => (sel === "#plejd-bindings" ? bindingsEl : null);

  panel._renderEditor();

  assert.match(bindingsEl.innerHTML, /3 press actions/);
  assert.match(bindingsEl.innerHTML, /1 press action(?!s)/);
  assert.match(bindingsEl.innerHTML, /Remote B/); // press-only binding's device via its first press trigger
});

// ── schedules ────────────────────────────────────────────────────────────────

function scheduleFormEl(values, days = []) {
  const dayEls = days.map((day) => ({
    checked: true,
    getAttribute: (attr) => (attr === "data-sched-day" ? String(day) : null),
  }));
  return {
    querySelector: (sel) => (sel in values ? { value: values[sel] } : null),
    querySelectorAll: (sel) => (sel === "[data-sched-day]" ? dayEls : []),
  };
}

test("_renderSchedules shows a loading state before the first list resolves", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const el = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  panel.querySelector = (sel) => (sel === "#plejd-schedules" ? el : null);

  panel._renderSchedules();

  assert.match(el.innerHTML, /Loading…/);
});

test("_renderSchedules shows a retry button after a failed load", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._schedulesLoadFailed = true;
  panel._scheduleError = "Could not load schedules: boom";
  const listeners = {};
  const retryBtn = { addEventListener: (ev, fn) => (listeners[ev] = fn) };
  const el = {
    innerHTML: "",
    querySelector: (sel) => (sel === "#sched-retry" ? retryBtn : null),
    querySelectorAll: () => [],
  };
  panel.querySelector = (sel) => (sel === "#plejd-schedules" ? el : null);
  let retried = false;
  panel._retryScheduleLoad = () => {
    retried = true;
  };

  panel._renderSchedules();
  assert.match(el.innerHTML, /Could not load schedules: boom/);
  listeners.click();
  assert.equal(retried, true);
});

test("_renderSchedules lists existing schedules with days, time, scene, and fade", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._schedules = [{ id: 0, name: "Evening", days: [0, 6], time: "18:30:00", scene: 3, fade: 5 }];
  panel._scheduleScenes = [{ index: 3, name: "Movie" }];
  const el = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  panel.querySelector = (sel) => (sel === "#plejd-schedules" ? el : null);

  panel._renderSchedules();

  assert.match(el.innerHTML, /Evening/);
  assert.match(el.innerHTML, /Mon, Sun/);
  assert.match(el.innerHTML, /18:30:00/);
  assert.match(el.innerHTML, /Movie/);
  assert.match(el.innerHTML, /5s fade/);
  assert.match(el.innerHTML, /data-sched-del="0"/);
});

test("_renderSchedules falls back to a placeholder scene name for an unknown index", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._schedules = [{ id: 0, name: "Morning", days: [], time: "06:00:00", scene: 9, fade: 0 }];
  panel._scheduleScenes = [];
  const el = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  panel.querySelector = (sel) => (sel === "#plejd-schedules" ? el : null);

  panel._renderSchedules();

  assert.match(el.innerHTML, /Scene 9/);
  assert.match(el.innerHTML, /— · 06:00:00/); // no days selected
});

test("_renderSchedules shows a placeholder when there are no schedules yet", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._schedules = [];
  const el = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  panel.querySelector = (sel) => (sel === "#plejd-schedules" ? el : null);

  panel._renderSchedules();

  assert.match(el.innerHTML, /No schedules yet\./);
});

test("_onScheduleSave rejects a blank name without calling the backend", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._schedules = [];
  panel._renderSchedules = () => {};
  let called = false;
  panel._saveSchedule = () => {
    called = true;
  };
  const el = scheduleFormEl({ "#sched-name": "  ", "#sched-scene": "3", "#sched-time": "06:00", "#sched-fade": "0" });

  panel._onScheduleSave(el);

  assert.equal(called, false);
  assert.match(panel._scheduleError, /Name is required/);
});

test("_onScheduleSave rejects when no day is selected", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._renderSchedules = () => {};
  let called = false;
  panel._saveSchedule = () => {
    called = true;
  };
  const el = scheduleFormEl({ "#sched-name": "X", "#sched-scene": "3", "#sched-time": "06:00", "#sched-fade": "0" });

  panel._onScheduleSave(el);

  assert.equal(called, false);
  assert.match(panel._scheduleError, /Pick at least one day/);
});

test("_onScheduleSave rejects an invalid time", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._renderSchedules = () => {};
  let called = false;
  panel._saveSchedule = () => {
    called = true;
  };
  const el = scheduleFormEl(
    { "#sched-name": "X", "#sched-scene": "3", "#sched-time": "not-a-time", "#sched-fade": "0" },
    [0],
  );

  panel._onScheduleSave(el);

  assert.equal(called, false);
  assert.match(panel._scheduleError, /Pick a valid time/);
});

test("_onScheduleSave rejects when no scene is picked", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._renderSchedules = () => {};
  let called = false;
  panel._saveSchedule = () => {
    called = true;
  };
  const el = scheduleFormEl({ "#sched-name": "X", "#sched-scene": "", "#sched-time": "06:00", "#sched-fade": "0" }, [
    0,
  ]);

  panel._onScheduleSave(el);

  assert.equal(called, false);
  assert.match(panel._scheduleError, /Pick a scene/);
});

test("_onScheduleSave rejects a negative fade", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._renderSchedules = () => {};
  let called = false;
  panel._saveSchedule = () => {
    called = true;
  };
  const el = scheduleFormEl(
    { "#sched-name": "X", "#sched-scene": "3", "#sched-time": "06:00", "#sched-fade": "-1" },
    [0],
  );

  panel._onScheduleSave(el);

  assert.equal(called, false);
  assert.match(panel._scheduleError, /Fade must be zero or a positive number/);
});

test("_onScheduleSave sends a normalized payload when the form is valid", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._renderSchedules = () => {};
  let payload;
  panel._saveSchedule = (p) => {
    payload = p;
  };
  const el = scheduleFormEl(
    { "#sched-name": "  Evening  ", "#sched-scene": "3", "#sched-time": "18:30", "#sched-fade": "5" },
    [6, 0],
  );

  panel._onScheduleSave(el);

  assert.deepEqual(plain(payload), { name: "Evening", days: [0, 6], time: "18:30", scene: 3, fade: 5 });
});

test("_saveSchedule adds a schedule and resets the form on success", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._renderSchedules = () => {};
  panel._scheduleForm = { name: "Evening", days: [0], time: "18:30", scene: "3", fade: 0 };
  let sentMsg;
  panel._callWS = (msg) => {
    sentMsg = msg;
    return Promise.resolve({ schedules: [{ id: 0, name: "Evening" }] });
  };

  await panel._saveSchedule({ name: "Evening", days: [0], time: "18:30", scene: 3, fade: 0 });

  assert.equal(sentMsg.type, "plejd/schedules/add");
  assert.deepEqual(panel._schedules, [{ id: 0, name: "Evening" }]);
  assert.equal(panel._scheduleForm.name, "");
  assert.deepEqual(plain(panel._scheduleForm.days), []);
  assert.equal(panel._scheduleNotice, "Saved.");
});

test("_saveSchedule surfaces a reload_failed warning instead of a plain Saved notice", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._renderSchedules = () => {};
  panel._scheduleForm = { name: "Evening", days: [0], time: "18:30", scene: "3", fade: 0 };
  panel._callWS = () =>
    Promise.resolve({
      schedules: [{ id: 0, name: "Evening" }],
      reload_failed: "Schedule saved, but Plejd failed to reload; try again",
    });

  await panel._saveSchedule({ name: "Evening", days: [0], time: "18:30", scene: 3, fade: 0 });

  // The save DID succeed (the form still resets) - only the notice must warn that the
  // integration didn't reload, instead of quietly saying "Saved." as if all were well.
  assert.equal(panel._scheduleNotice, "Schedule saved, but Plejd failed to reload; try again");
  assert.equal(panel._scheduleForm.name, "");
});

test("_saveSchedule surfaces a backend error without resetting the form", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._renderSchedules = () => {};
  panel._scheduleForm = { name: "Evening", days: [0], time: "18:30", scene: "3", fade: 0 };
  panel._callWS = () => Promise.reject(new Error("no_free_slots"));

  await panel._saveSchedule({ name: "Evening", days: [0], time: "18:30", scene: 3, fade: 0 });

  assert.equal(panel._scheduleError, "no_free_slots");
  assert.equal(panel._scheduleForm.name, "Evening"); // not reset on failure
  assert.equal(panel._scheduleBusy, false);
});

test("deleting a schedule preserves an in-progress add form", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._schedules = [{ id: 0, name: "Keep" }, { id: 1, name: "Drop" }];
  panel._renderSchedules = () => {};
  let sentMsg;
  panel._callWS = (msg) => {
    sentMsg = msg;
    return Promise.resolve({ schedules: [{ id: 0, name: "Keep" }] });
  };
  const el = scheduleFormEl(
    { "#sched-name": "New one", "#sched-scene": "3", "#sched-time": "07:00", "#sched-fade": "0" },
    [1],
  );

  panel._onScheduleDelete(el, 1);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(sentMsg.type, "plejd/schedules/delete");
  assert.equal(sentMsg.schedule_id, 1);
  assert.deepEqual(panel._schedules, [{ id: 0, name: "Keep" }]);
  assert.equal(panel._scheduleForm.name, "New one"); // in-progress add survives the delete
});

test("_deleteSchedule surfaces a reload_failed warning", async () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._renderSchedules = () => {};
  panel._callWS = () =>
    Promise.resolve({
      schedules: [],
      reload_failed: "Schedule saved, but Plejd failed to reload; try again",
    });

  await panel._deleteSchedule(1);

  // The delete DID persist - the removed schedule may still be programmed on the device,
  // so silence here would leave the user thinking it's gone when it might not be.
  assert.equal(panel._scheduleNotice, "Schedule saved, but Plejd failed to reload; try again");
});

test("a day checkbox toggles the day in the form via _wireSchedules", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  const listeners = {};
  const dayEl = {
    checked: true,
    getAttribute: () => "2",
    addEventListener: (ev, fn) => (listeners[ev] = fn),
  };
  const el = {
    querySelectorAll: (sel) => (sel === "[data-sched-day]" ? [dayEl] : []),
    querySelector: () => null,
  };

  panel._wireSchedules(el);
  listeners.change({ target: dayEl });
  assert.deepEqual(plain(panel._scheduleForm.days), [2]);

  dayEl.checked = false;
  listeners.change({ target: dayEl });
  assert.deepEqual(plain(panel._scheduleForm.days), []);
});

test("_wireSchedules routes a delete button click through _onScheduleDelete", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  let deletedId;
  panel._onScheduleDelete = (_el, id) => {
    deletedId = id;
  };
  const listeners = {};
  const delBtn = {
    getAttribute: () => "4",
    addEventListener: (ev, fn) => (listeners[ev] = fn),
  };
  const el = {
    querySelectorAll: (sel) => (sel === "[data-sched-del]" ? [delBtn] : []),
    querySelector: () => null,
  };

  panel._wireSchedules(el);
  listeners.click();

  assert.equal(deletedId, "4");
});

test("_onScheduleSave and _onScheduleDelete are no-ops while a save/delete is in flight", () => {
  const PanelClass = loadPanelClass();
  const panel = new PanelClass();
  panel._scheduleBusy = true;
  let saveCalled = false;
  let deleteCalled = false;
  panel._saveSchedule = () => {
    saveCalled = true;
  };
  panel._deleteSchedule = () => {
    deleteCalled = true;
  };
  const el = scheduleFormEl({ "#sched-name": "X", "#sched-scene": "3", "#sched-time": "06:00", "#sched-fade": "0" }, [
    0,
  ]);

  panel._onScheduleSave(el);
  panel._onScheduleDelete(el, 1);

  assert.equal(saveCalled, false);
  assert.equal(deleteCalled, false);
});

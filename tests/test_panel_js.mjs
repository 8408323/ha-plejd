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

test("hass updates coalesce lights renders to one animation frame", () => {
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

  panel._renderShell = () => {
    shells += 1;
  };
  panel._loadBindings = () => {
    loads += 1;
  };
  panel._updateLights = () => {
    lights += 1;
  };
  panel._updateMotion = () => {
    motion += 1;
  };

  panel.hass = { states: {} };
  panel.hass = { states: {} };
  panel.hass = { states: {} };

  assert.equal(shells, 1);
  assert.equal(loads, 1);
  assert.equal(frames.length, 1);
  assert.equal(lights, 0);
  assert.equal(motion, 0);

  frames.shift()();
  assert.equal(lights, 1);
  assert.equal(motion, 1);

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
  panel._updateLights = () => {};
  panel._updateMotion = () => {};
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
  panel._updateLights = () => {};
  panel._updateMotion = () => {};
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
  panel._scheduleLightsUpdate = () => {};
  panel._renderEditor = () => {};
  panel._updateMotion = () => {};

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
  panel._scheduleLightsUpdate = () => {};
  panel._renderEditor = () => {};
  panel._updateMotion = () => {};

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

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

  panel._renderShell = () => {
    shells += 1;
  };
  panel._loadBindings = () => {
    loads += 1;
  };
  panel._updateLights = () => {
    lights += 1;
  };

  panel.hass = { states: {} };
  panel.hass = { states: {} };
  panel.hass = { states: {} };

  assert.equal(shells, 1);
  assert.equal(loads, 1);
  assert.equal(frames.length, 1);
  assert.equal(lights, 0);

  frames.shift()();
  assert.equal(lights, 1);

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

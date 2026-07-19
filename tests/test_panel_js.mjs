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

test("disconnect cancels a queued timeout fallback when requestAnimationFrame is unavailable", () => {
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

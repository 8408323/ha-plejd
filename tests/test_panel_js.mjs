import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const PANEL_PATH = path.resolve(
  process.env.PANEL_PATH || "custom_components/plejd/frontend/panel.js",
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

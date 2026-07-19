// Plejd dashboard — a custom Home Assistant sidebar panel (not a Lovelace view).
// Home Assistant sets `hass`, `narrow`, `route`, and `panel` properties on this element.
// It lists the site's Plejd lights and scenes, and hosts the remote → light dim-binding
// editor: map a dimmer remote's hold/release device triggers to smooth dimming of a
// light or area.

const CARD = `
  background: var(--card-background-color, #fff);
  border-radius: 12px;
  box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,.1));
  padding: 16px;
`;
const INPUT = `
  width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px;
  border: 1px solid var(--divider-color, #e0e0e0);
  background: var(--secondary-background-color, #fafafa);
  color: var(--primary-text-color, #212121); font-size: .95rem;
`;
const BTN = `
  border: none; border-radius: 8px; padding: 8px 16px; font-size: .95rem; cursor: pointer;
  background: var(--primary-color, #03a9f4); color: var(--text-primary-color, #fff);
`;
const LABEL = "display:block;font-size:.8rem;color:var(--secondary-text-color,#727272);margin:0 0 4px";

// Entity/area/device names are user-controlled; escape before interpolating into innerHTML.
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// One human label for a device automation trigger (type, optionally its subtype).
const triggerLabel = (t) => {
  const type = (t.type || "trigger").replace(/_/g, " ");
  return t.subtype ? `${type} · ${t.subtype}` : type;
};

// Instantaneous press-action types a trigger can map to (mirrors bindings.py PRESS_ACTIONS).
const PRESS_ACTIONS = ["toggle", "on", "off", "scene", "service"];
const PRESS_ACTION_LABELS = {
  toggle: "Toggle",
  on: "Turn on",
  off: "Turn off",
  scene: "Activate scene",
  service: "Call service",
};

class PlejdPanel extends HTMLElement {
  constructor() {
    super();
    this._bindings = null; // loaded list, null until the first WS list resolves (or a failed load)
    this._loadFailed = false; // a list load errored — block saving so it can't overwrite storage
    this._triggers = {}; // device_id -> its device triggers (only successful loads are cached)
    this._areasById = {};
    this._devicesById = {};
    this._registriesLoaded = false;
    this._registriesPromise = null;
    this._form = { target: "", device: "", up: "", down: "", stop: "", presses: [] };
    this._error = "";
    this._notice = "";
    this._busy = false;
    this._scenesError = "";
    this._lightsFrame = null;
    const useAnimationFrame = Boolean(
      globalThis.requestAnimationFrame && globalThis.cancelAnimationFrame,
    );
    this._scheduleLightsFrame = useAnimationFrame
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : (cb) => globalThis.setTimeout(cb, 0);
    this._cancelLightsFrame = useAnimationFrame
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : globalThis.clearTimeout.bind(globalThis);
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) {
      this._renderShell();
      this._loadBindings();
      this._loadRegistries();
    }
    // Only the live lights list tracks state; leave the editor DOM (and any in-progress
    // form entry) untouched on the frequent hass state updates.
    this._scheduleLightsUpdate();
  }

  set panel(panel) {
    this._panel = panel;
  }

  connectedCallback() {
    // On (re)connect, rebuild only if the shell is gone; otherwise refresh the live lights
    // list and leave the editor DOM — and any in-progress form entry — untouched.
    if (!this._hass) return;
    if (!this.querySelector("#plejd-lights")) this._renderShell();
    this._scheduleLightsUpdate();
  }

  disconnectedCallback() {
    if (this._lightsFrame === null) return;
    this._cancelLightsFrame(this._lightsFrame);
    this._lightsFrame = null;
  }

  // ── data ──────────────────────────────────────────────────────────────────

  async _callWS(message) {
    return this._hass.callWS(message);
  }

  async _callService(domain, service, data) {
    return this._hass.callService(domain, service, data);
  }

  async _loadBindings() {
    this._loadFailed = false;
    try {
      const res = await this._callWS({ type: "plejd/dim_bindings/list" });
      this._bindings = res.bindings || [];
    } catch (err) {
      // Keep _bindings unset (not []): a save sends the full list as a replacement, so a
      // wrong empty baseline could wipe stored bindings. Offer a retry instead of saving.
      this._bindings = null;
      this._loadFailed = true;
      this._error = `Could not load bindings: ${err.message || err}`;
    }
    this._renderEditor();
  }

  _retryLoad() {
    this._error = "";
    this._bindings = null;
    this._loadFailed = false;
    this._renderEditor(); // back to the "Loading…" state
    this._loadBindings();
  }

  async _loadTriggers(deviceId) {
    if (!deviceId || this._triggers[deviceId]) return;
    try {
      const res = await this._callWS({ type: "plejd/device_triggers", device_id: deviceId });
      this._triggers[deviceId] = res.triggers || []; // cache only on success (even if empty)
    } catch (err) {
      // Don't cache a failed load — leave it unset so re-selecting the remote retries.
      this._error = `Could not load triggers: ${err.message || err}`;
    }
  }

  async _loadRegistries() {
    if (typeof this._hass?.callWS !== "function") return;
    if (this._registriesLoaded) return;
    if (this._registriesPromise) return this._registriesPromise;
    this._registriesPromise = (async () => {
      try {
        const [areas, devices] = await Promise.all([
          this._callWS({ type: "config/area_registry/list" }),
          this._callWS({ type: "config/device_registry/list" }),
        ]);
        this._areasById = Object.fromEntries(
          (areas || []).map((a) => [a.area_id, a.name || a.area_id]),
        );
        this._devicesById = Object.fromEntries(
          (devices || []).map((d) => [d.id, d.name_by_user || d.name || d.id]),
        );
        this._registriesLoaded = true;
      } catch (err) {
        this._areasById = {};
        this._devicesById = {};
        console.warn("Plejd panel: failed to load area/device registries", err);
      } finally {
        this._registriesPromise = null;
        this._renderEditor();
      }
    })();
    return this._registriesPromise;
  }

  async _save(bindings, resetForm = false) {
    this._busy = true;
    this._error = "";
    this._notice = "";
    this._renderEditor();
    try {
      const res = await this._callWS({ type: "plejd/dim_bindings/save", bindings });
      this._bindings = res.bindings || [];
      this._notice = "Saved.";
      // Clear the add form only after an add; a delete must not wipe an in-progress add.
      if (resetForm) this._form = { target: "", device: "", up: "", down: "", stop: "", presses: [] };
    } catch (err) {
      // Surface whatever the backend returns. Invalid input (e.g. a missing stop trigger)
      // is already caught client-side before saving; the backend validates too and returns
      // a specific reason for it (a generic message for unexpected failures).
      this._error = err.message || String(err);
    } finally {
      this._busy = false;
      this._renderEditor();
    }
  }

  _lights() {
    const hass = this._hass;
    if (!hass) return [];
    return Object.values(hass.states)
      .filter(
        (s) =>
          s.entity_id.startsWith("light.") &&
          (hass.entities?.[s.entity_id]?.platform === "plejd" ||
            s.attributes.attribution === "Plejd"),
      )
      .sort((a, b) =>
        (a.attributes.friendly_name || a.entity_id).localeCompare(
          b.attributes.friendly_name || b.entity_id,
        ),
      );
  }

  _allLights() {
    const hass = this._hass;
    return Object.values(hass.states)
      .filter((s) => s.entity_id.startsWith("light."))
      .map((s) => ({ id: s.entity_id, name: s.attributes.friendly_name || s.entity_id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  _areas() {
    if (this._registriesLoaded) {
      return Object.entries(this._areasById)
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    const hass = this._hass;
    return Object.values(hass?.areas || {})
      .map((a) => ({ id: a.area_id, name: a.name || a.area_id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  _devices() {
    if (this._registriesLoaded) {
      return Object.entries(this._devicesById)
        .map(([id, name]) => ({ id, name }))
        .filter((d) => d.name)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    const hass = this._hass;
    return Object.values(hass?.devices || {})
      .map((d) => ({ id: d.id, name: d.name_by_user || d.name || d.id }))
      .filter((d) => d.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  _scenes() {
    const hass = this._hass;
    if (!hass) return [];
    return Object.values(hass.states)
      .filter((s) => s.entity_id.startsWith("scene."))
      .map((s) => ({ id: s.entity_id, name: s.attributes.friendly_name || s.entity_id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // This site's own Plejd scenes for the Scenes list, filtered the same way _lights()
  // restricts to Plejd lights — unlike _scenes() above, which lists every HA scene for
  // the press-action picker (a binding can activate any scene, not just a Plejd one).
  _plejdScenes() {
    const hass = this._hass;
    if (!hass) return [];
    return Object.values(hass.states)
      .filter(
        (s) =>
          s.entity_id.startsWith("scene.") &&
          (hass.entities?.[s.entity_id]?.platform === "plejd" ||
            s.attributes.attribution === "Plejd"),
      )
      .sort((a, b) =>
        (a.attributes.friendly_name || a.entity_id).localeCompare(
          b.attributes.friendly_name || b.entity_id,
        ),
      );
  }

  async _activateScene(entityId) {
    this._scenesError = "";
    try {
      await this._callService("scene", "turn_on", { entity_id: entityId });
    } catch (err) {
      this._scenesError = `Could not activate scene: ${err.message || err}`;
    }
    this._updateScenes();
  }

  _entityName(entityId) {
    return this._hass.states[entityId]?.attributes.friendly_name || entityId;
  }

  _areaName(areaId) {
    return this._areasById[areaId] || this._hass.areas?.[areaId]?.name || areaId;
  }

  _deviceName(deviceId) {
    if (this._devicesById[deviceId]) return this._devicesById[deviceId];
    const d = this._hass.devices?.[deviceId];
    return d?.name_by_user || d?.name || deviceId;
  }

  // A stored binding's target(s) -> a human string. Lists every target (a binding can
  // hold multiple entities/areas/devices) so a Delete's scope isn't misread.
  _targetName(binding) {
    const t = binding.targets || {};
    const names = [
      ...[].concat(t.entity_id || []).map((id) => this._entityName(id)),
      ...[].concat(t.area_id || []).map((id) => this._areaName(id)),
      ...[].concat(t.device_id || []).map((id) => this._deviceName(id)),
    ];
    return names.length ? names.join(", ") : "—";
  }

  // The remote device behind a binding's triggers (up/down/stop/press triggers are
  // device-trigger dicts). A press-only binding has no up/down/stop, so fall back to
  // its first press trigger.
  _bindingDevice(binding) {
    const t = binding.up || binding.down || binding.stop || binding.presses?.[0]?.trigger;
    return t?.device_id ? this._deviceName(t.device_id) : "—";
  }

  // ── rendering ───────────────────────────────────────────────────────────────

  _renderShell() {
    this.innerHTML = `
      <div style="padding:16px 16px 48px;max-width:760px;margin:0 auto;color:var(--primary-text-color,#212121);font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif)">
        <h1 style="font-weight:400;margin:8px 4px 20px">Plejd</h1>
        <div id="plejd-lights" style="${CARD}"></div>
        <div id="plejd-scenes" style="${CARD};margin-top:16px"></div>
        <div id="plejd-bindings" style="${CARD};margin-top:16px"></div>
      </div>`;
    this._updateScenes();
    this._renderEditor();
  }

  _scheduleLightsUpdate() {
    if (this._lightsFrame !== null) return;
    this._lightsFrame = this._scheduleLightsFrame(() => {
      this._lightsFrame = null;
      this._updateLights();
    });
  }

  _updateLights() {
    const el = this.querySelector("#plejd-lights");
    if (!el) return;
    const lights = this._lights();
    const rows = lights
      .map((s) => {
        const name = s.attributes.friendly_name || s.entity_id;
        const on = s.state === "on";
        const bri = s.attributes.brightness;
        const level = on && bri != null ? `${Math.round((bri / 255) * 100)}%` : on ? "on" : "off";
        const dot = on ? "var(--state-light-active-color, #fdd835)" : "var(--disabled-text-color, #9e9e9e)";
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid var(--divider-color,#e0e0e0)">
            <span style="width:10px;height:10px;border-radius:50%;background:${dot};flex:none"></span>
            <span style="flex:1">${esc(name)}</span>
            <span style="color:var(--secondary-text-color,#727272)">${level}</span>
          </div>`;
      })
      .join("");
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
        <h2 style="font-weight:500;font-size:1.05rem;margin:0">Lights</h2>
        <span style="color:var(--secondary-text-color,#727272);font-size:.9rem">${lights.length}</span>
      </div>
      ${rows || '<p style="color:var(--secondary-text-color,#727272)">No Plejd lights found.</p>'}`;
  }

  _updateScenes() {
    const el = this.querySelector("#plejd-scenes");
    if (!el) return;
    const scenes = this._plejdScenes();
    const rows = scenes
      .map((s) => {
        const name = s.attributes.friendly_name || s.entity_id;
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid var(--divider-color,#e0e0e0)">
            <span style="flex:1">${esc(name)}</span>
            <button data-activate-scene="${esc(s.entity_id)}" style="${BTN}">Activate</button>
          </div>`;
      })
      .join("");
    const error = this._scenesError
      ? `<p style="color:var(--error-color,#db4437);margin:8px 0 0">${esc(this._scenesError)}</p>`
      : "";
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
        <h2 style="font-weight:500;font-size:1.05rem;margin:0">Scenes</h2>
        <span style="color:var(--secondary-text-color,#727272);font-size:.9rem">${scenes.length}</span>
      </div>
      ${rows || '<p style="color:var(--secondary-text-color,#727272)">No Plejd scenes found.</p>'}
      ${error}`;
    el.querySelectorAll("[data-activate-scene]").forEach((btn) =>
      btn.addEventListener("click", () => this._activateScene(btn.getAttribute("data-activate-scene"))),
    );
  }

  _triggerOptions(deviceId, selected) {
    const triggers = this._triggers[deviceId] || [];
    const opts = triggers
      .map(
        (t, i) =>
          `<option value="${i}" ${String(i) === String(selected) ? "selected" : ""}>${esc(triggerLabel(t))}</option>`,
      )
      .join("");
    return `<option value="">(none)</option>${opts}`;
  }

  _pressActionOptions(selected) {
    const opts = PRESS_ACTIONS.map(
      (type) => `<option value="${type}" ${type === selected ? "selected" : ""}>${PRESS_ACTION_LABELS[type]}</option>`,
    ).join("");
    return `<option value="">Select an action…</option>${opts}`;
  }

  // One "press action" row: a trigger picker (same device-trigger data as up/down/stop)
  // plus an action-type picker and that type's own fields (scene entity, or service +
  // domain + optional JSON data).
  _pressRowHtml(row, i) {
    const extra =
      row.type === "scene"
        ? `
        <div style="margin-top:8px">
          <label for="f-press-entity-${i}" style="${LABEL}">Scene</label>
          <select id="f-press-entity-${i}" style="${INPUT}">
            <option value="">Select a scene…</option>
            ${this._scenes()
              .map(
                (s) =>
                  `<option value="${esc(s.id)}" ${row.entity_id === s.id ? "selected" : ""}>${esc(s.name)}</option>`,
              )
              .join("")}
          </select>
        </div>`
        : row.type === "service"
          ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
          <div><label for="f-press-domain-${i}" style="${LABEL}">Domain</label><input id="f-press-domain-${i}" style="${INPUT}" value="${esc(row.domain)}" placeholder="light"></div>
          <div><label for="f-press-service-${i}" style="${LABEL}">Service</label><input id="f-press-service-${i}" style="${INPUT}" value="${esc(row.service)}" placeholder="turn_on"></div>
        </div>
        <div style="margin-top:8px">
          <label for="f-press-data-${i}" style="${LABEL}">Data (JSON, optional)</label>
          <textarea id="f-press-data-${i}" style="${INPUT};min-height:56px;font-family:monospace">${esc(row.data)}</textarea>
        </div>`
          : "";
    return `
      <div style="border:1px solid var(--divider-color,#e0e0e0);border-radius:8px;padding:10px;margin-top:8px">
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end">
          <div><label for="f-press-trigger-${i}" style="${LABEL}">Trigger</label><select id="f-press-trigger-${i}" style="${INPUT}">${this._triggerOptions(this._form.device, row.trigger)}</select></div>
          <div><label for="f-press-type-${i}" style="${LABEL}">Action</label><select id="f-press-type-${i}" style="${INPUT}">${this._pressActionOptions(row.type)}</select></div>
          <button data-remove-press="${i}" type="button" style="${BTN};background:var(--error-color,#db4437)" aria-label="Remove press action">✕</button>
        </div>
        ${extra}
      </div>`;
  }

  _renderEditor() {
    const el = this.querySelector("#plejd-bindings");
    if (!el) return;

    if (this._bindings === null) {
      // Failed load: show the error + Retry, and no editor — saving now could overwrite
      // stored bindings from an unknown baseline. Otherwise it's the initial load.
      el.innerHTML = this._loadFailed
        ? `
          <h2 style="font-weight:500;font-size:1.05rem;margin:0 0 8px">Remote dim bindings</h2>
          <p style="color:var(--error-color,#db4437);margin:0 0 12px">${esc(this._error)}</p>
          <button id="f-retry" style="${BTN}">Retry</button>`
        : `
          <h2 style="font-weight:500;font-size:1.05rem;margin:0 0 8px">Remote dim bindings</h2>
          <p style="color:var(--secondary-text-color,#727272);margin:0">Loading…</p>`;
      el.querySelector("#f-retry")?.addEventListener("click", () => this._retryLoad());
      return;
    }

    const list = this._bindings.length
      ? this._bindings
          .map((b) => {
            const dirs = ["up", "down", "stop"].filter((k) => b[k]).join(" / ");
            const pressCount = (b.presses || []).length;
            const parts = [];
            if (dirs) parts.push(dirs);
            if (pressCount) parts.push(`${pressCount} press action${pressCount === 1 ? "" : "s"}`);
            const summary = parts.length ? parts.join(", ") : "—";
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid var(--divider-color,#e0e0e0)">
                <div style="flex:1">
                  <div>${esc(this._targetName(b))}</div>
                  <div style="font-size:.8rem;color:var(--secondary-text-color,#727272)">
                    ${esc(this._bindingDevice(b))} · ${esc(summary)}
                  </div>
                </div>
                <button data-del="${esc(b.id)}" style="${BTN};background:var(--error-color,#db4437)">Delete</button>
              </div>`;
          })
          .join("")
      : '<p style="color:var(--secondary-text-color,#727272);margin:0 0 12px">No bindings yet.</p>';

    const lightOpts = this._allLights()
      .map(
        (l) =>
          `<option value="light:${esc(l.id)}" ${this._form.target === `light:${l.id}` ? "selected" : ""}>${esc(l.name)}</option>`,
      )
      .join("");
    const areaOpts = this._areas()
      .map(
        (a) =>
          `<option value="area:${esc(a.id)}" ${this._form.target === `area:${a.id}` ? "selected" : ""}>${esc(a.name)}</option>`,
      )
      .join("");
    const deviceOpts = this._devices()
      .map(
        (d) =>
          `<option value="${esc(d.id)}" ${this._form.device === d.id ? "selected" : ""}>${esc(d.name)}</option>`,
      )
      .join("");

    const pressRows = this._form.presses.map((row, i) => this._pressRowHtml(row, i)).join("");

    const triggerRow = this._form.device
      ? `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
          <div><label for="f-up" style="${LABEL}">Dim up (hold)</label><select id="f-up" style="${INPUT}">${this._triggerOptions(this._form.device, this._form.up)}</select></div>
          <div><label for="f-down" style="${LABEL}">Dim down (hold)</label><select id="f-down" style="${INPUT}">${this._triggerOptions(this._form.device, this._form.down)}</select></div>
          <div><label for="f-stop" style="${LABEL}">Release (stop)</label><select id="f-stop" style="${INPUT}">${this._triggerOptions(this._form.device, this._form.stop)}</select></div>
        </div>
        ${this._form.device in this._triggers && this._triggers[this._form.device].length === 0 ? '<p style="color:var(--secondary-text-color,#727272);font-size:.85rem;margin:8px 0 0">This device exposes no triggers.</p>' : ""}
        <div style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="${LABEL};margin:0">Press actions</span>
            <button id="f-press-add" type="button" style="${BTN}">+ Add press action</button>
          </div>
          ${pressRows || '<p style="color:var(--secondary-text-color,#727272);font-size:.85rem;margin:6px 0 0">No press actions yet.</p>'}
        </div>`
      : "";

    const feedback = this._error
      ? `<p style="color:var(--error-color,#db4437);margin:12px 0 0">${esc(this._error)}</p>`
      : this._notice
        ? `<p style="color:var(--secondary-text-color,#727272);margin:12px 0 0">${esc(this._notice)}</p>`
        : "";

    el.innerHTML = `
      <h2 style="font-weight:500;font-size:1.05rem;margin:0 0 4px">Remote dim bindings</h2>
      <p style="color:var(--secondary-text-color,#727272);margin:0 0 12px">
        Bind a dimmer remote's hold/release to smooth dimming of a light or a whole room,
        and/or map any of its other triggers to an instant press action.
      </p>
      ${list}
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--divider-color,#e0e0e0)">
        <h3 style="font-weight:500;font-size:.95rem;margin:0 0 12px">Add a binding</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label for="f-target" style="${LABEL}">Light or room</label>
            <select id="f-target" style="${INPUT}">
              <option value="">Select a target…</option>
              <optgroup label="Lights">${lightOpts}</optgroup>
              <optgroup label="Rooms">${areaOpts}</optgroup>
            </select>
          </div>
          <div>
            <label for="f-device" style="${LABEL}">Remote</label>
            <select id="f-device" style="${INPUT}">
              <option value="">Select a remote…</option>
              ${deviceOpts}
            </select>
          </div>
        </div>
        ${triggerRow}
        ${feedback}
        <div style="margin-top:16px;text-align:right">
          <button id="f-save" style="${BTN}" ${this._busy ? "disabled" : ""}>${this._busy ? "Saving…" : "Add binding"}</button>
        </div>
      </div>`;

    this._wire(el);
  }

  _wire(el) {
    el.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () => this._onDelete(el, btn.getAttribute("data-del"))),
    );
    el.querySelector("#f-target")?.addEventListener("change", (e) => {
      this._form.target = e.target.value;
    });
    el.querySelector("#f-device")?.addEventListener("change", async (e) => {
      this._readForm(el);
      this._form.device = e.target.value;
      this._form.up = this._form.down = this._form.stop = "";
      // A press row's trigger index is only meaningful for the previously selected
      // device's trigger list; clear it, but keep the rest of the row (action type, etc).
      this._form.presses = this._form.presses.map((row) => ({ ...row, trigger: "" }));
      this._notice = this._error = "";
      await this._loadTriggers(this._form.device);
      this._renderEditor();
    });
    el.querySelector("#f-up")?.addEventListener("change", (e) => {
      this._form.up = e.target.value;
    });
    el.querySelector("#f-down")?.addEventListener("change", (e) => {
      this._form.down = e.target.value;
    });
    el.querySelector("#f-stop")?.addEventListener("change", (e) => {
      this._form.stop = e.target.value;
    });
    el.querySelector("#f-press-add")?.addEventListener("click", () => {
      this._readForm(el);
      this._form.presses.push({ trigger: "", type: "", entity_id: "", domain: "", service: "", data: "" });
      this._renderEditor();
    });
    this._form.presses.forEach((_row, i) => {
      el.querySelector(`#f-press-trigger-${i}`)?.addEventListener("change", (e) => {
        this._form.presses[i].trigger = e.target.value;
      });
      el.querySelector(`#f-press-type-${i}`)?.addEventListener("change", (e) => {
        // The visible fields differ per action type, so redraw (unlike the up/down/stop
        // pickers, whose options never change shape).
        this._readForm(el);
        this._form.presses[i].type = e.target.value;
        this._renderEditor();
      });
      el.querySelector(`#f-press-entity-${i}`)?.addEventListener("change", (e) => {
        this._form.presses[i].entity_id = e.target.value;
      });
      el.querySelector(`#f-press-domain-${i}`)?.addEventListener("input", (e) => {
        this._form.presses[i].domain = e.target.value;
      });
      el.querySelector(`#f-press-service-${i}`)?.addEventListener("input", (e) => {
        this._form.presses[i].service = e.target.value;
      });
      el.querySelector(`#f-press-data-${i}`)?.addEventListener("input", (e) => {
        this._form.presses[i].data = e.target.value;
      });
      el.querySelector(`[data-remove-press="${i}"]`)?.addEventListener("click", () => {
        this._readForm(el);
        this._form.presses.splice(i, 1);
        this._renderEditor();
      });
    });
    el.querySelector("#f-save")?.addEventListener("click", () => this._onSave(el));
  }

  _readForm(el) {
    const val = (id) => el.querySelector(id)?.value ?? "";
    this._form.target = val("#f-target");
    this._form.device = val("#f-device");
    this._form.up = val("#f-up");
    this._form.down = val("#f-down");
    this._form.stop = val("#f-stop");
    // A press row's action-type-specific fields aren't all rendered at once (e.g. the
    // scene picker only exists in the DOM when type is "scene"); fall back to the
    // in-memory value for any field currently hidden, so switching type and back keeps it.
    this._form.presses = this._form.presses.map((row, i) => ({
      trigger: el.querySelector(`#f-press-trigger-${i}`)?.value ?? row.trigger,
      type: el.querySelector(`#f-press-type-${i}`)?.value ?? row.type,
      entity_id: el.querySelector(`#f-press-entity-${i}`)?.value ?? row.entity_id,
      domain: el.querySelector(`#f-press-domain-${i}`)?.value ?? row.domain,
      service: el.querySelector(`#f-press-service-${i}`)?.value ?? row.service,
      data: el.querySelector(`#f-press-data-${i}`)?.value ?? row.data,
    }));
  }

  _targetFromForm() {
    const idx = this._form.target.indexOf(":");
    if (idx < 0) return null;
    const kind = this._form.target.slice(0, idx);
    const id = this._form.target.slice(idx + 1);
    if (kind === "light") return { entity_id: [id] };
    if (kind === "area") return { area_id: [id] };
    return null;
  }

  _triggerByIndex(deviceId, index) {
    if (index === "" || index == null) return null;
    return (this._triggers[deviceId] || [])[Number(index)] || null;
  }

  // Assemble the configured press rows into {trigger, action} pairs, mirroring the
  // backend's _validate_presses so obvious mistakes are caught before a round-trip.
  // A row left entirely empty is skipped; a partially filled one throws so _onSave can
  // surface it via _fail instead of silently dropping it.
  _pressesFromForm() {
    const presses = [];
    this._form.presses.forEach((row, i) => {
      const trigger = this._triggerByIndex(this._form.device, row.trigger);
      const type = row.type;
      // _readForm deliberately keeps a hidden field's last value when the row's type
      // changes away from it (so switching back doesn't lose it) — only count a field
      // as "input" when it's the one the currently selected type actually shows, so a
      // row a user visibly cleared back to blank isn't treated as still filled in.
      const relevantExtra =
        type === "scene"
          ? row.entity_id
          : type === "service"
            ? row.domain || row.service || (row.data && row.data.trim())
            : false;
      const hasAnyInput = trigger || type || relevantExtra;
      if (!hasAnyInput) return;

      if (!trigger) throw new Error(`Press action ${i + 1}: pick a trigger.`);
      if (!PRESS_ACTIONS.includes(type)) throw new Error(`Press action ${i + 1}: pick an action.`);

      const action = { type };
      if (type === "scene") {
        if (!row.entity_id) throw new Error(`Press action ${i + 1}: pick a scene.`);
        action.entity_id = row.entity_id;
      } else if (type === "service") {
        if (!row.domain || !row.service) {
          throw new Error(`Press action ${i + 1}: service actions need a domain and a service.`);
        }
        action.domain = row.domain.trim();
        action.service = row.service.trim();
        if (row.data && row.data.trim()) {
          let data;
          try {
            data = JSON.parse(row.data);
          } catch {
            throw new Error(`Press action ${i + 1}: data must be valid JSON.`);
          }
          // The backend merges this into the service call with `**data`, which needs a
          // mapping — a JSON array/string/number would raise there instead of calling
          // the service when the trigger fires.
          if (typeof data !== "object" || data === null || Array.isArray(data)) {
            throw new Error(`Press action ${i + 1}: data must be a JSON object.`);
          }
          action.data = data;
        }
      }
      presses.push({ trigger, action });
    });
    return presses;
  }

  _onSave(el) {
    if (this._busy) return;
    this._readForm(el);
    this._error = this._notice = "";

    if (!this._form.device) return this._fail("Pick a remote.");

    const up = this._triggerByIndex(this._form.device, this._form.up);
    const down = this._triggerByIndex(this._form.device, this._form.down);
    const stop = this._triggerByIndex(this._form.device, this._form.stop);
    if ((up || down) && !stop) return this._fail("Pick a release (stop) trigger.");

    let presses;
    try {
      presses = this._pressesFromForm();
    } catch (err) {
      return this._fail(err.message);
    }
    if (!up && !down && !presses.length) {
      return this._fail("Pick a dim up/down trigger or add at least one press action.");
    }

    // A target (light/room) only matters to the actions that actually need it: dim
    // up/down and toggle/on/off no-op without one (bindings.py's toggle/on/off path
    // and DimRamp both bail out on an empty target). Scene and service never require
    // one — scene.turn_on only uses the scene's own entity_id, and a service call
    // merges {**target, **data} with an empty target fine. Some services take no
    // target at all (persistent_notification.create, homeassistant.restart, ...); the
    // client can't know which, so it's on the user to supply what their service needs.
    const pressNeedsTarget = (press) => !["scene", "service"].includes(press.action.type);
    const needsTarget = Boolean(up || down) || presses.some(pressNeedsTarget);
    const targets = this._targetFromForm();
    if (needsTarget && !targets) return this._fail("Pick a light or room.");

    const binding = {};
    if (targets) binding.targets = targets;
    if (up) binding.up = up;
    if (down) binding.down = down;
    // A stop trigger only matters alongside a start (up/down already required it above);
    // a stray one attached to a press-only binding would still fire plejd.stop_dim for a
    // single-Plejd-light target and could cancel an unrelated binding's ramp on that light.
    if (up || down) binding.stop = stop;
    if (presses.length) binding.presses = presses;
    this._save([...this._bindings, binding], true); // reset the add form after a successful add
  }

  _onDelete(el, id) {
    if (this._busy) return;
    this._readForm(el); // keep any in-progress add entry across the delete's re-render
    this._save(this._bindings.filter((b) => String(b.id) !== String(id)));
  }

  _fail(message) {
    this._error = message;
    this._renderEditor();
  }
}

customElements.define("plejd-panel", PlejdPanel);

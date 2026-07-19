// Plejd dashboard — a custom Home Assistant sidebar panel (not a Lovelace view).
// Home Assistant sets `hass`, `narrow`, `route`, and `panel` properties on this element.
// It lists the site's Plejd lights and hosts the remote → light dim-binding editor:
// map a dimmer remote's hold/release device triggers to smooth dimming of a light or area.

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

class PlejdPanel extends HTMLElement {
  constructor() {
    super();
    this._bindings = null; // loaded list, null until the first WS list resolves (or a failed load)
    this._loadFailed = false; // a list load errored — block saving so it can't overwrite storage
    this._triggers = {}; // device_id -> its device triggers (only successful loads are cached)
    this._form = { target: "", device: "", up: "", down: "", stop: "" };
    this._error = "";
    this._notice = "";
    this._busy = false;
    this._lightsFrame = null;
    const hasAnimationFrame = Boolean(
      globalThis.requestAnimationFrame && globalThis.cancelAnimationFrame,
    );
    this._scheduleLightsFrame = hasAnimationFrame
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : (cb) => globalThis.setTimeout(cb, 0);
    this._cancelLightsFrame = hasAnimationFrame
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : globalThis.clearTimeout.bind(globalThis);
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) {
      this._renderShell();
      this._loadBindings();
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
    this._cancelLightsFrame?.(this._lightsFrame);
    this._lightsFrame = null;
  }

  // ── data ──────────────────────────────────────────────────────────────────

  async _callWS(message) {
    return this._hass.callWS(message);
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

  async _save(bindings) {
    this._busy = true;
    this._error = "";
    this._notice = "";
    this._renderEditor();
    try {
      const res = await this._callWS({ type: "plejd/dim_bindings/save", bindings });
      this._bindings = res.bindings || [];
      this._notice = "Saved.";
      this._form = { target: "", device: "", up: "", down: "", stop: "" };
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
    const hass = this._hass;
    return Object.values(hass.areas || {})
      .map((a) => ({ id: a.area_id, name: a.name || a.area_id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  _devices() {
    const hass = this._hass;
    return Object.values(hass.devices || {})
      .map((d) => ({ id: d.id, name: d.name_by_user || d.name || d.id }))
      .filter((d) => d.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  _entityName(entityId) {
    return this._hass.states[entityId]?.attributes.friendly_name || entityId;
  }

  _areaName(areaId) {
    return this._hass.areas?.[areaId]?.name || areaId;
  }

  _deviceName(deviceId) {
    const d = this._hass.devices?.[deviceId];
    return d?.name_by_user || d?.name || deviceId;
  }

  // A stored binding's target -> a short human string.
  _targetName(binding) {
    const t = binding.targets || {};
    if (t.entity_id?.length) return this._entityName([].concat(t.entity_id)[0]);
    if (t.area_id?.length) return this._areaName([].concat(t.area_id)[0]);
    if (t.device_id?.length) return this._deviceName([].concat(t.device_id)[0]);
    return "—";
  }

  // The remote device behind a binding's triggers (up/down/stop are device-trigger dicts).
  _bindingDevice(binding) {
    const t = binding.up || binding.down || binding.stop;
    return t?.device_id ? this._deviceName(t.device_id) : "—";
  }

  // ── rendering ───────────────────────────────────────────────────────────────

  _renderShell() {
    this.innerHTML = `
      <div style="padding:16px 16px 48px;max-width:760px;margin:0 auto;color:var(--primary-text-color,#212121);font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif)">
        <h1 style="font-weight:400;margin:8px 4px 20px">Plejd</h1>
        <div id="plejd-lights" style="${CARD}"></div>
        <div id="plejd-bindings" style="${CARD};margin-top:16px"></div>
      </div>`;
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
            const dirs = ["up", "down", "stop"].filter((k) => b[k]).join(" / ") || "—";
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid var(--divider-color,#e0e0e0)">
                <div style="flex:1">
                  <div>${esc(this._targetName(b))}</div>
                  <div style="font-size:.8rem;color:var(--secondary-text-color,#727272)">
                    ${esc(this._bindingDevice(b))} · ${esc(dirs)}
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

    const triggerRow = this._form.device
      ? `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
          <div><label style="${LABEL}">Dim up (hold)</label><select id="f-up" style="${INPUT}">${this._triggerOptions(this._form.device, this._form.up)}</select></div>
          <div><label style="${LABEL}">Dim down (hold)</label><select id="f-down" style="${INPUT}">${this._triggerOptions(this._form.device, this._form.down)}</select></div>
          <div><label style="${LABEL}">Release (stop)</label><select id="f-stop" style="${INPUT}">${this._triggerOptions(this._form.device, this._form.stop)}</select></div>
        </div>
        ${this._form.device in this._triggers && this._triggers[this._form.device].length === 0 ? '<p style="color:var(--secondary-text-color,#727272);font-size:.85rem;margin:8px 0 0">This device exposes no triggers.</p>' : ""}`
      : "";

    const feedback = this._error
      ? `<p style="color:var(--error-color,#db4437);margin:12px 0 0">${esc(this._error)}</p>`
      : this._notice
        ? `<p style="color:var(--secondary-text-color,#727272);margin:12px 0 0">${esc(this._notice)}</p>`
        : "";

    el.innerHTML = `
      <h2 style="font-weight:500;font-size:1.05rem;margin:0 0 4px">Remote dim bindings</h2>
      <p style="color:var(--secondary-text-color,#727272);margin:0 0 12px">
        Bind a dimmer remote's hold/release to smooth dimming of a light or a whole room.
      </p>
      ${list}
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--divider-color,#e0e0e0)">
        <h3 style="font-weight:500;font-size:.95rem;margin:0 0 12px">Add a binding</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="${LABEL}">Light or room</label>
            <select id="f-target" style="${INPUT}">
              <option value="">Select a target…</option>
              <optgroup label="Lights">${lightOpts}</optgroup>
              <optgroup label="Rooms">${areaOpts}</optgroup>
            </select>
          </div>
          <div>
            <label style="${LABEL}">Remote</label>
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
      btn.addEventListener("click", () => this._onDelete(btn.getAttribute("data-del"))),
    );
    el.querySelector("#f-target")?.addEventListener("change", (e) => {
      this._form.target = e.target.value;
    });
    el.querySelector("#f-device")?.addEventListener("change", async (e) => {
      this._readForm(el);
      this._form.device = e.target.value;
      this._form.up = this._form.down = this._form.stop = "";
      this._notice = this._error = "";
      await this._loadTriggers(this._form.device);
      this._renderEditor();
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

  _onSave(el) {
    if (this._busy) return;
    this._readForm(el);
    this._error = this._notice = "";

    const targets = this._targetFromForm();
    if (!targets) return this._fail("Pick a light or room.");
    if (!this._form.device) return this._fail("Pick a remote.");

    const up = this._triggerByIndex(this._form.device, this._form.up);
    const down = this._triggerByIndex(this._form.device, this._form.down);
    const stop = this._triggerByIndex(this._form.device, this._form.stop);
    if (!up && !down) return this._fail("Pick a dim up and/or dim down trigger.");
    if (!stop) return this._fail("Pick a release (stop) trigger.");

    const binding = { targets, stop };
    if (up) binding.up = up;
    if (down) binding.down = down;
    this._save([...this._bindings, binding]);
  }

  _onDelete(id) {
    if (this._busy) return;
    this._save(this._bindings.filter((b) => String(b.id) !== String(id)));
  }

  _fail(message) {
    this._error = message;
    this._renderEditor();
  }
}

customElements.define("plejd-panel", PlejdPanel);

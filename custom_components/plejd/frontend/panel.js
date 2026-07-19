// Plejd dashboard — a custom Home Assistant sidebar panel (not a Lovelace view).
// Home Assistant sets `hass`, `narrow`, `route`, and `panel` properties on this element.
// Slice A: list the site's Plejd lights and their state. Later slices add the
// remote -> light dim-binding editor here.

const CARD = `
  background: var(--card-background-color, #fff);
  border-radius: 12px;
  box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,.1));
  padding: 16px;
`;

class PlejdPanel extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  set panel(panel) {
    this._panel = panel;
  }

  connectedCallback() {
    this._render();
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

  _render() {
    if (!this._hass) return;
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
            <span style="flex:1">${name}</span>
            <span style="color:var(--secondary-text-color,#727272)">${level}</span>
          </div>`;
      })
      .join("");

    this.innerHTML = `
      <div style="padding:16px 16px 48px;max-width:720px;margin:0 auto;color:var(--primary-text-color,#212121);font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif)">
        <h1 style="font-weight:400;margin:8px 4px 20px">Plejd</h1>
        <div style="${CARD}">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
            <h2 style="font-weight:500;font-size:1.05rem;margin:0">Lights</h2>
            <span style="color:var(--secondary-text-color,#727272);font-size:.9rem">${lights.length}</span>
          </div>
          ${rows || '<p style="color:var(--secondary-text-color,#727272)">No Plejd lights found.</p>'}
        </div>
        <div style="${CARD};margin-top:16px">
          <h2 style="font-weight:500;font-size:1.05rem;margin:0 0 8px">Remote dim bindings</h2>
          <p style="color:var(--secondary-text-color,#727272);margin:0">
            Bind a dimmer remote's hold/release to smooth dimming of a light or a whole room.
            Configuration UI coming here next.
          </p>
        </div>
      </div>`;
  }
}

customElements.define("plejd-panel", PlejdPanel);

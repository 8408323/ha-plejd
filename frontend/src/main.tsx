import { createRoot, Root } from "react-dom/client";
import App from "./App";
import css from "./styles.css?inline";

class PlejdPanel extends HTMLElement {
  private root?: Root;
  private _hass: any;
  private _narrow = false;
  set hass(h: any) { this._hass = h; this.render(); }
  set narrow(n: boolean) { this._narrow = n; this.render(); }
  connectedCallback() {
    if (this.root) return;
    // a re-attached element keeps its shadow root; attachShadow() would throw a second time
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    shadow.replaceChildren();
    const style = document.createElement("style");
    style.textContent = css;
    const mount = document.createElement("div");
    shadow.append(style, mount);
    this.root = createRoot(mount);
    this.render();
  }
  disconnectedCallback() { this.root?.unmount(); this.root = undefined; }
  private render() { if (this.root && this._hass) this.root.render(<App hass={this._hass} narrow={this._narrow} />); }
}

if (!customElements.get("plejd-panel")) customElements.define("plejd-panel", PlejdPanel);

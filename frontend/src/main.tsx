import { createRoot, Root } from "react-dom/client";
import App from "./App";
import css from "./styles.css?inline";

// The panel's own typeface, shared with the other Villa panels. @font-face doesn't work inside a shadow
// root, so the stylesheet goes into the document once; without internet the system font is used.
function loadFont() {
  if (document.getElementById("plejd-font")) return;
  const link = document.createElement("link");
  link.id = "plejd-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
  document.head.append(link);
}

class PlejdPanel extends HTMLElement {
  private root?: Root;
  private _hass: any;
  private _narrow = false;
  set hass(h: any) { this._hass = h; this.render(); }
  set narrow(n: boolean) { this._narrow = n; this.render(); }
  connectedCallback() {
    if (this.root) return;
    loadFont();
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

// A module only runs once per URL, so finding the element already defined means a newer build was just
// loaded into a page still running the old one (panel.py versions the URL); custom elements can't be
// redefined, so reload to actually run it.
if (customElements.get("plejd-panel")) location.reload();
else customElements.define("plejd-panel", PlejdPanel);

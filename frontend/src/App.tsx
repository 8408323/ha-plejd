import { useEffect, useRef, useState } from "react";
import { BindingForm, PRESS_ACTIONS, PressRow, Trigger, buildBinding, buildSchedule, clampPosition, stepTemperature } from "./logic";

// Home Assistant's panel host sets `hass` (states, entity/device/area registries, callWS/callService).
type St = { entity_id: string; state: string; attributes: Record<string, any> };
type Ctx = { hass: any };

const TABS = ["devices", "automations", "settings"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { devices: "Devices", automations: "Automations", settings: "Settings" };
// Matches DIM_INTERVAL in dim_ramp.py: the same pacing the hold-to-dim ramp uses per tick.
const DRAG_SEND_INTERVAL_MS = 100;
const COVER_FEATURE_SET_POSITION = 4; // CoverEntityFeature.SET_POSITION
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // index 0=Mon, mirrors const.py WEEKDAYS
const PRESS_LABELS: Record<string, string> = { toggle: "Toggle", on: "Turn on", off: "Turn off", scene: "Activate scene", service: "Call service" };
const TRANSPORTS = [
  ["auto", "Automatic (gateway first, Bluetooth fallback)"],
  ["gateway", "Gateway only (remote/cloud)"],
  ["ble", "Bluetooth only (local)"],
];

const errMsg = (e: any) => e?.message || String(e);
const nameOf = (s: St) => s.attributes.friendly_name || s.entity_id;
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
const isPlejd = (hass: any, s: St) => hass.entities?.[s.entity_id]?.platform === "plejd" || s.attributes.attribution === "Plejd";
const plejdStates = (hass: any, domain: string, pred: (s: St) => boolean = () => true): St[] =>
  (Object.values(hass.states) as St[])
    .filter((s) => s.entity_id.startsWith(`${domain}.`) && isPlejd(hass, s) && pred(s))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
const deviceName = (hass: any, id: string) => hass.devices?.[id]?.name_by_user || hass.devices?.[id]?.name || id;
// A sensor's physical device name ("Hallway"), not its entity name ("Hallway Motion").
const ownerName = (hass: any, s: St) => {
  const id = hass.entities?.[s.entity_id]?.device_id;
  return id ? deviceName(hass, id) : nameOf(s);
};

export default function App({ hass, narrow }: { hass: any; narrow: boolean }) {
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem("plejd_tab") as Tab) || "devices");
  const go = (t: Tab) => { setTab(t); localStorage.setItem("plejd_tab", t); };
  const ctx = { hass };
  return (
    <div className={`page ${narrow ? "narrow" : ""}`}>
      <header>
        <h1>Plejd</h1>
        <nav className="tabs">
          {TABS.map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => go(t)}>{TAB_LABELS[t]}</button>)}
        </nav>
      </header>
      {tab === "devices" && (
        <div className="grid">
          <Lights {...ctx} /><Scenes {...ctx} /><Climate {...ctx} /><Covers {...ctx} /><Motion {...ctx} /><Health {...ctx} />
        </div>
      )}
      {tab === "automations" && <div className="grid"><Schedules {...ctx} /><Bindings {...ctx} /></div>}
      {tab === "settings" && <div className="grid"><Settings {...ctx} /><AddDevice {...ctx} /></div>}
    </div>
  );
}

function Card({ title, count, wide, children }: { title: string; count?: number; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className={`card ${wide ? "wide" : ""}`}>
      <div className="card-head"><h2>{title}</h2>{count != null && <span className="count">{count}</span>}</div>
      {children}
    </section>
  );
}

const Empty = ({ text }: { text: string }) => <p className="muted">{text}</p>;

// ── devices ─────────────────────────────────────────────────────────────────

function Lights({ hass }: Ctx) {
  const lights = plejdStates(hass, "light");
  return (
    <Card title="Lights" count={lights.length}>
      {lights.map((s) => <LightRow key={s.entity_id} hass={hass} s={s} />)}
      {!lights.length && <Empty text="No Plejd lights found." />}
    </Card>
  );
}

// Optimistic on/brightness until hass's own push catches up: a repeated click lands well within the
// round-trip, so reading hass.states would resend the pre-click state instead of alternating.
function LightRow({ hass, s }: Ctx & { s: St }) {
  const id = s.entity_id;
  const unavailable = s.state === "unavailable";
  const bri = s.attributes.brightness;
  const realOn = s.state === "on";
  const realPct = bri != null ? Math.round((bri / 255) * 100) : 100;
  const [onOverride, setOnOverride] = useState<boolean | null>(null);
  const [pctOverride, setPctOverride] = useState<number | null>(null);
  // Bumped per command so a failure only rolls back if nothing newer superseded it.
  const token = useRef(0);
  // One brightness send in flight at a time (sends can land out of order), keeping only the latest queued.
  const send = useRef({ sending: false, queued: null as number | null, last: 0, timer: 0 });
  useEffect(() => { if (onOverride === realOn) setOnOverride(null); }, [realOn, onOverride]);
  useEffect(() => { if (pctOverride === realPct) setPctOverride(null); }, [realPct, pctOverride]);
  useEffect(() => () => clearTimeout(send.current.timer), []);

  const on = onOverride ?? realOn;
  const pct = pctOverride ?? realPct;
  const dimmable = Array.isArray(s.attributes.supported_color_modes) ? s.attributes.supported_color_modes.includes("brightness") : bri != null;
  const level = unavailable ? "unavailable" : on && bri != null ? `${pct}%` : on ? "on" : "off";

  const toggle = () => {
    if (unavailable) return;
    const t = ++token.current;
    setOnOverride(!on);
    hass.callService("light", on ? "turn_off" : "turn_on", { entity_id: id }).catch((e: any) => {
      console.warn("Plejd panel: failed to toggle light", id, e);
      if (token.current === t) setOnOverride(null);
    });
  };
  const sendPct = (p: number) => {
    const st = send.current;
    const t = ++token.current;
    setOnOverride(true); // brightness_pct always turns the light on
    setPctOverride(p);
    if (st.sending) { st.queued = p; return; }
    st.sending = true;
    hass.callService("light", "turn_on", { entity_id: id, brightness_pct: p })
      .catch((e: any) => {
        console.warn("Plejd panel: failed to set brightness", id, e);
        if (token.current === t) { setPctOverride(null); setOnOverride(null); }
      })
      .finally(() => {
        st.sending = false;
        if (st.queued !== null) { const next = st.queued; st.queued = null; sendPct(next); }
      });
  };
  // Live while dragging, throttled so a fast drag doesn't flood the mesh; the trailing send ships the final value.
  const slide = (p: number) => {
    const st = send.current;
    setPctOverride(p);
    clearTimeout(st.timer);
    const wait = DRAG_SEND_INTERVAL_MS - (Date.now() - st.last);
    const fire = () => { st.last = Date.now(); sendPct(p); };
    if (wait <= 0) fire();
    else st.timer = window.setTimeout(fire, wait);
  };

  return (
    <div className="row">
      <div className="line">
        <button type="button" role="switch" aria-checked={on} aria-label={`${on ? "Turn off" : "Turn on"} ${nameOf(s)}`}
          className={`switch ${on ? "on" : ""}`} disabled={unavailable} onClick={toggle} />
        <span className={`grow ${unavailable ? "off" : "click"}`} onClick={toggle}>{nameOf(s)}</span>
        <span className="count">{level}</span>
      </div>
      {dimmable && <input type="range" min={1} max={100} value={pct} disabled={unavailable} aria-label={`Brightness ${nameOf(s)}`}
        onChange={(e) => slide(Number(e.target.value))} />}
    </div>
  );
}

function Climate({ hass }: Ctx) {
  const climates = plejdStates(hass, "climate");
  return (
    <Card title="Climate" count={climates.length}>
      {climates.map((s) => <ClimateRow key={s.entity_id} hass={hass} s={s} />)}
      {!climates.length && <Empty text="No Plejd thermostats found." />}
    </Card>
  );
}

function ClimateRow({ hass, s }: Ctx & { s: St }) {
  const real = s.attributes.temperature;
  // Optimistic setpoint so quick taps accumulate instead of all stepping from the same stale value.
  const [override, setOverride] = useState<number | null>(null);
  useEffect(() => { if (override === real) setOverride(null); }, [real, override]);
  const target = override ?? real;
  const disabled = target == null || s.state === "unavailable";
  const step = (dir: 1 | -1) => {
    const next = stepTemperature(target, dir, s.attributes);
    setOverride(next);
    hass.callService("climate", "set_temperature", { entity_id: s.entity_id, temperature: next }).catch((e: any) => {
      console.warn("Plejd panel: failed to set climate temperature", e);
      setOverride((cur) => (cur === next ? null : cur));
    });
  };
  return (
    <div className="row line">
      <span className="grow">{nameOf(s)}</span>
      <button className="btn small" disabled={disabled} onClick={() => step(-1)} aria-label="Decrease target temperature">−</button>
      <span className="temp">{target != null ? `${target}°C` : "—"}</span>
      <button className="btn small" disabled={disabled} onClick={() => step(1)} aria-label="Increase target temperature">+</button>
    </div>
  );
}

function Covers({ hass }: Ctx) {
  const covers = plejdStates(hass, "cover");
  return (
    <Card title="Covers" count={covers.length}>
      {covers.map((s) => <CoverRow key={s.entity_id} hass={hass} s={s} />)}
      {!covers.length && <Empty text="No Plejd covers found." />}
    </Card>
  );
}

function CoverRow({ hass, s }: Ctx & { s: St }) {
  const id = s.entity_id;
  const unavailable = s.state === "unavailable";
  const position = clampPosition(s.attributes.current_position);
  // Plejd covers are assumed_state with no position read-back: remember what we last commanded
  // (only once HA accepted it), else the slider would fall back to "unknown" after every command.
  const [commanded, setCommanded] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const token = useRef(0);
  const known = position ?? commanded;
  const canSetPosition = Boolean((s.attributes.supported_features || 0) & COVER_FEATURE_SET_POSITION);

  const command = (service: string, data: Record<string, any>, newPosition: number | null) => {
    const t = ++token.current;
    hass.callService("cover", service, { entity_id: id, ...data })
      .then(() => { if (newPosition != null && token.current === t) setCommanded(newPosition); })
      .catch((e: any) => console.warn(`Plejd panel: ${service} failed for ${id}`, e));
  };
  // A position slider sends once on release, not one command per drag tick.
  const release = () => {
    if (drag == null) return;
    command("set_cover_position", { position: drag }, drag);
    setDrag(null);
  };

  return (
    <div className="row">
      <div className="line">
        <span className="grow">{nameOf(s)}</span>
        <span className="count">{unavailable ? "unavailable" : position != null ? `${position}%` : s.state}</span>
      </div>
      <div className="line" style={{ marginTop: 8 }}>
        <button className="btn" disabled={unavailable} onClick={() => command("open_cover", {}, 100)}>Open</button>
        <button className="btn ghost" disabled={unavailable} onClick={() => command("stop_cover", {}, null)}>Stop</button>
        <button className="btn" disabled={unavailable} onClick={() => command("close_cover", {}, 0)}>Close</button>
        {canSetPosition && <input type="range" min={0} max={100} value={drag ?? known ?? 50} disabled={unavailable}
          aria-label={`Position ${nameOf(s)}`} onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={release} onKeyUp={release} onPointerCancel={() => setDrag(null)} />}
      </div>
    </div>
  );
}

function Scenes({ hass }: Ctx) {
  const scenes = plejdStates(hass, "scene");
  const [error, setError] = useState("");
  const activate = (id: string) => {
    setError("");
    hass.callService("scene", "turn_on", { entity_id: id }).catch((e: any) => setError(`Could not activate scene: ${errMsg(e)}`));
  };
  return (
    <Card title="Scenes" count={scenes.length}>
      {scenes.map((s) => (
        <div key={s.entity_id} className="row line">
          <span className="grow">{nameOf(s)}</span>
          <button className="btn" onClick={() => activate(s.entity_id)}>Activate</button>
        </div>
      ))}
      {!scenes.length && <Empty text="No Plejd scenes found." />}
      {error && <p className="error">{error}</p>}
    </Card>
  );
}

function Motion({ hass }: Ctx) {
  const sensors = plejdStates(hass, "binary_sensor", (s) => s.attributes.device_class === "motion");
  const lux = (s: St) => {
    const deviceId = hass.entities?.[s.entity_id]?.device_id;
    const sensor = deviceId && (Object.values(hass.states) as St[]).find((x) =>
      x.entity_id.startsWith("sensor.") && x.attributes.device_class === "illuminance" && hass.entities?.[x.entity_id]?.device_id === deviceId);
    return sensor && !["unavailable", "unknown"].includes(sensor.state) ? ` · ${sensor.state} lx` : "";
  };
  return (
    <Card title="Motion & illuminance" count={sensors.length}>
      {sensors.map((s) => (
        <div key={s.entity_id} className="row line">
          <span className={`dot ${s.state === "on" ? "on" : ""}`} />
          <span className="grow">{ownerName(hass, s)}</span>
          <span className="count">{["unavailable", "unknown"].includes(s.state) ? "Unavailable" : s.state === "on" ? "Detected" : "Clear"}{lux(s)}</span>
        </div>
      ))}
      {!sensors.length && <Empty text="No motion sensors found." />}
    </Card>
  );
}

function Health({ hass }: Ctx) {
  const faulted = plejdStates(hass, "binary_sensor", (s) => s.attributes.device_class === "problem" && s.state === "on")
    .map((s) => ({ id: s.entity_id, name: ownerName(hass, s), flags: (s.attributes.active_faults || []).map((f: string) => f.replace(/_/g, " ")).join(", ") }))
    .sort(byName);
  return (
    <Card title="Device health" count={faulted.length}>
      {faulted.map((f) => (
        <div key={f.id} className="row line"><span className="dot bad" /><span className="grow">{f.name}</span><span className="count">{f.flags}</span></div>
      ))}
      {!faulted.length && <Empty text="All devices healthy." />}
    </Card>
  );
}

// ── automations ─────────────────────────────────────────────────────────────

type Schedule = { id: number; name: string; days: number[]; time: string; scene: number; fade: number };
const EMPTY_SCHEDULE = { name: "", days: [] as number[], time: "07:00", scene: "", fade: "0" };

function Schedules({ hass }: Ctx) {
  // null until loaded; a failed load offers Retry rather than an add form with no scene list.
  const [list, setList] = useState<Schedule[] | null>(null);
  const [scenes, setScenes] = useState<{ index: number; name: string }[]>([]);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_SCHEDULE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () => {
    setLoadError("");
    hass.callWS({ type: "plejd/schedules/list" })
      .then((r: any) => { setList(r.schedules || []); setScenes(r.scenes || []); })
      .catch((e: any) => setLoadError(`Could not load schedules: ${errMsg(e)}`));
  };
  useEffect(load, []);

  const run = async (msg: Record<string, any>, after?: () => void) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await hass.callWS(msg);
      setList(r.schedules || []);
      // Saved, but the entry didn't reload: the on-device event may not match yet, so say so.
      setNotice(r.reload_failed || (after ? "Saved." : ""));
      after?.();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const add = () => {
    let payload;
    try { payload = buildSchedule(form); } catch (e) { setError(errMsg(e)); setNotice(""); return; }
    run({ type: "plejd/schedules/add", ...payload }, () => setForm(EMPTY_SCHEDULE));
  };
  const sceneName = (i: number) => scenes.find((s) => s.index === i)?.name || `Scene ${i}`;
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  return (
    <Card title="Schedules" wide>
      <p className="lead">Run a scene automatically on a weekly schedule, straight from the mesh — no automation needed.</p>
      {list === null ? (
        loadError ? <><p className="error">{loadError}</p><div className="actions"><button className="btn" onClick={load}>Retry</button></div></> : <Empty text="Loading…" />
      ) : (
        <>
          {list.map((s) => (
            <div key={s.id} className="row line">
              <div className="grow">
                <div>{s.name}</div>
                <div className="muted">{s.days?.length ? s.days.map((d) => WEEKDAYS[d]).join(", ") : "—"} · {s.time} · {sceneName(s.scene)}{s.fade ? ` · ${s.fade}s fade` : ""}</div>
              </div>
              <button className="btn danger" disabled={busy} onClick={() => run({ type: "plejd/schedules/delete", schedule_id: s.id })}>Delete</button>
            </div>
          ))}
          {!list.length && <Empty text="No schedules yet." />}
          <div className="form">
            <h3>Add a schedule</h3>
            <div className="fields">
              <label className="f"><span>Name</span><input value={form.name} placeholder="Evening lights" onChange={(e) => set({ name: e.target.value })} /></label>
              <label className="f"><span>Scene</span>
                <select value={form.scene} onChange={(e) => set({ scene: e.target.value })}>
                  <option value="">Select a scene…</option>
                  {scenes.map((s) => <option key={s.index} value={s.index}>{s.name}</option>)}
                </select>
              </label>
              <label className="f"><span>Time</span><input type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} /></label>
              <label className="f"><span>Fade (seconds, optional)</span><input type="number" min={0} value={form.fade} onChange={(e) => set({ fade: e.target.value })} /></label>
            </div>
            <span className="label" style={{ marginTop: 10 }}>Days</span>
            <div className="checks">
              {WEEKDAYS.map((label, i) => (
                <label key={i}><input type="checkbox" checked={form.days.includes(i)}
                  onChange={(e) => set({ days: e.target.checked ? [...form.days, i] : form.days.filter((d) => d !== i) })} />{label}</label>
              ))}
            </div>
            {error ? <p className="error">{error}</p> : notice && <p className="notice">{notice}</p>}
            <div className="actions"><button className="btn" disabled={busy} onClick={add}>{busy ? "Saving…" : "Add schedule"}</button></div>
          </div>
        </>
      )}
    </Card>
  );
}

type DeviceTriggers = { triggers: Trigger[]; kind: string };
const EMPTY_BINDING: BindingForm = { target: "", device: "", up: "", down: "", stop: "", presses: [] };
const EMPTY_PRESS: PressRow = { trigger: "", type: "", entity_id: "", domain: "", service: "", data: "" };
const triggerLabel = (t: Trigger) => {
  const type = (t.type || "trigger").replace(/_/g, " ");
  return t.subtype ? `${type} · ${t.subtype}` : type;
};

function Bindings({ hass }: Ctx) {
  // null until loaded. Saving sends the full list as a replacement, so never save from a failed load.
  const [list, setList] = useState<any[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [triggers, setTriggers] = useState<Record<string, DeviceTriggers>>({}); // only successful loads are cached
  const [form, setForm] = useState<BindingForm>(EMPTY_BINDING);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () => {
    setLoadError("");
    hass.callWS({ type: "plejd/dim_bindings/list" })
      .then((r: any) => setList(r.bindings || []))
      .catch((e: any) => setLoadError(`Could not load bindings: ${errMsg(e)}`));
  };
  useEffect(load, []);

  const pickDevice = async (device: string) => {
    // A trigger index only means something for the previously selected device's list.
    setForm({ ...form, device, up: "", down: "", stop: "", presses: form.presses.map((p) => ({ ...p, trigger: "" })) });
    setError(""); setNotice("");
    if (!device || triggers[device]) return;
    try {
      const r = await hass.callWS({ type: "plejd/device_triggers", device_id: device });
      setTriggers((cur) => ({ ...cur, [device]: { triggers: r.triggers || [], kind: r.device_kind || "remote" } }));
    } catch (e) {
      setError(`Could not load triggers: ${errMsg(e)}`);
    }
  };
  const save = async (bindings: any[], resetForm: boolean) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await hass.callWS({ type: "plejd/dim_bindings/save", bindings });
      setList(r.bindings || []);
      setNotice("Saved.");
      if (resetForm) setForm(EMPTY_BINDING); // a delete must not wipe an in-progress add
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const add = () => {
    try {
      save([...list!, buildBinding(form, triggers[form.device]?.triggers || [])], true);
    } catch (e) {
      setError(errMsg(e)); setNotice("");
    }
  };

  const areaName = (id: string) => hass.areas?.[id]?.name || id;
  const entityName = (id: string) => hass.states[id]?.attributes.friendly_name || id;
  const targetName = (b: any) => {
    const t = b.targets || {};
    const names = [
      ...[].concat(t.entity_id || []).map(entityName),
      ...[].concat(t.area_id || []).map(areaName),
      ...[].concat(t.device_id || []).map((id: string) => deviceName(hass, id)),
    ];
    return names.length ? names.join(", ") : "—";
  };
  const summary = (b: any) => {
    const parts = [["up", "down", "stop"].filter((k) => b[k]).join(" / ")].filter(Boolean);
    const n = (b.presses || []).length;
    if (n) parts.push(`${n} press action${n === 1 ? "" : "s"}`);
    const remote = (b.up || b.down || b.stop || b.presses?.[0]?.trigger)?.device_id;
    return `${remote ? deviceName(hass, remote) : "—"} · ${parts.join(", ") || "—"}`;
  };

  const lights = (Object.values(hass.states) as St[]).filter((s) => s.entity_id.startsWith("light."))
    .map((s) => ({ id: s.entity_id, name: nameOf(s) })).sort(byName);
  const areas = Object.values(hass.areas || {}).map((a: any) => ({ id: a.area_id, name: a.name || a.area_id })).sort(byName);
  const devices = Object.values(hass.devices || {}).map((d: any) => ({ id: d.id, name: d.name_by_user || d.name })).filter((d) => d.name).sort(byName);
  const allScenes = (Object.values(hass.states) as St[]).filter((s) => s.entity_id.startsWith("scene."))
    .map((s) => ({ id: s.entity_id, name: nameOf(s) })).sort(byName);
  const dev = triggers[form.device];
  const kind = dev?.kind || "remote";
  const triggerOptions = (
    <><option value="">(none)</option>{(dev?.triggers || []).map((t, i) => <option key={i} value={i}>{triggerLabel(t)}</option>)}</>
  );
  const setPress = (i: number, patch: Partial<PressRow>) =>
    setForm({ ...form, presses: form.presses.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <Card title="Remote dim bindings" wide>
      <p className="lead">Bind a dimmer remote's hold/release to smooth dimming of a light or a whole room, and/or map any of its other triggers to an instant press action.</p>
      {list === null ? (
        loadError ? <><p className="error">{loadError}</p><div className="actions"><button className="btn" onClick={load}>Retry</button></div></> : <Empty text="Loading…" />
      ) : (
        <>
          {list.map((b) => (
            <div key={b.id} className="row line">
              <div className="grow"><div>{targetName(b)}</div><div className="muted">{summary(b)}</div></div>
              <button className="btn danger" disabled={busy} onClick={() => save(list.filter((x) => String(x.id) !== String(b.id)), false)}>Delete</button>
            </div>
          ))}
          {!list.length && <Empty text="No bindings yet." />}
          <div className="form">
            <h3>Add a binding</h3>
            <div className="fields">
              <label className="f"><span>Light or room</span>
                <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                  <option value="">Select a target…</option>
                  <optgroup label="Lights">{lights.map((l) => <option key={l.id} value={`light:${l.id}`}>{l.name}</option>)}</optgroup>
                  <optgroup label="Rooms">{areas.map((a) => <option key={a.id} value={`area:${a.id}`}>{a.name}</option>)}</optgroup>
                </select>
              </label>
              <label className="f"><span>Remote</span>
                <select value={form.device} onChange={(e) => pickDevice(e.target.value)}>
                  <option value="">Select a remote…</option>
                  {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
            </div>
            {form.device && (
              <>
                {kind === "remote" ? (
                  <div className="fields">
                    <label className="f"><span>Dim up (hold)</span><select value={form.up} onChange={(e) => setForm({ ...form, up: e.target.value })}>{triggerOptions}</select></label>
                    <label className="f"><span>Dim down (hold)</span><select value={form.down} onChange={(e) => setForm({ ...form, down: e.target.value })}>{triggerOptions}</select></label>
                    <label className="f"><span>Release (stop)</span><select value={form.stop} onChange={(e) => setForm({ ...form, stop: e.target.value })}>{triggerOptions}</select></label>
                  </div>
                ) : (
                  <p className="muted">This is a {kind === "door_window" ? "door/window" : "motion"} sensor, not a dimmer remote — use a press action below to react to it.</p>
                )}
                {dev && !dev.triggers.length && <p className="muted">This device exposes no triggers.</p>}
                <div className="line" style={{ marginTop: 14 }}>
                  <span className="label grow" style={{ margin: 0 }}>Press actions</span>
                  <button className="btn" onClick={() => setForm({ ...form, presses: [...form.presses, EMPTY_PRESS] })}>+ Add press action</button>
                </div>
                {form.presses.map((p, i) => (
                  <div key={i} className="box">
                    <div className="fields press" style={{ marginTop: 0 }}>
                      <label className="f"><span>Trigger</span><select value={p.trigger} onChange={(e) => setPress(i, { trigger: e.target.value })}>{triggerOptions}</select></label>
                      <label className="f"><span>Action</span>
                        <select value={p.type} onChange={(e) => setPress(i, { type: e.target.value })}>
                          <option value="">Select an action…</option>
                          {PRESS_ACTIONS.map((a) => <option key={a} value={a}>{PRESS_LABELS[a]}</option>)}
                        </select>
                      </label>
                      <button className="btn danger" aria-label="Remove press action" onClick={() => setForm({ ...form, presses: form.presses.filter((_, j) => j !== i) })}>✕</button>
                    </div>
                    {p.type === "scene" && (
                      <label className="f" style={{ marginTop: 8 }}><span>Scene</span>
                        <select value={p.entity_id} onChange={(e) => setPress(i, { entity_id: e.target.value })}>
                          <option value="">Select a scene…</option>
                          {allScenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </label>
                    )}
                    {p.type === "service" && (
                      <>
                        <div className="fields">
                          <label className="f"><span>Domain</span><input value={p.domain} placeholder="light" onChange={(e) => setPress(i, { domain: e.target.value })} /></label>
                          <label className="f"><span>Service</span><input value={p.service} placeholder="turn_on" onChange={(e) => setPress(i, { service: e.target.value })} /></label>
                        </div>
                        <label className="f" style={{ marginTop: 8 }}><span>Data (JSON, optional)</span><textarea value={p.data} onChange={(e) => setPress(i, { data: e.target.value })} /></label>
                      </>
                    )}
                  </div>
                ))}
                {!form.presses.length && <p className="muted">No press actions yet.</p>}
              </>
            )}
            {error ? <p className="error">{error}</p> : notice && <p className="notice">{notice}</p>}
            <div className="actions"><button className="btn" disabled={busy} onClick={add}>{busy ? "Saving…" : "Add binding"}</button></div>
          </div>
        </>
      )}
    </Card>
  );
}

// ── settings ────────────────────────────────────────────────────────────────

type SettingsData = { transport: string; has_gateway: boolean; holiday_lights: string[]; holiday_window_start: string; holiday_window_end: string };

function Settings({ hass }: Ctx) {
  const [saved, setSaved] = useState<SettingsData | null>(null);
  const [draft, setDraft] = useState<SettingsData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () => {
    setLoadError("");
    hass.callWS({ type: "plejd/settings/get" })
      .then((r: SettingsData) => { setSaved(r); setDraft(r); })
      .catch((e: any) => setLoadError(`Could not load settings: ${errMsg(e)}`));
  };
  useEffect(load, []);

  if (!draft || !saved) {
    return (
      <Card title="Settings">
        {loadError ? <><p className="error">{loadError}</p><div className="actions"><button className="btn" onClick={load}>Retry</button></div></> : <Empty text="Loading…" />}
      </Card>
    );
  }
  const set = (patch: Partial<SettingsData>) => { setDraft({ ...draft, ...patch }); setNotice(""); };
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const save = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const { transport, holiday_lights, holiday_window_start, holiday_window_end } = draft;
      const r = await hass.callWS({ type: "plejd/settings/set", transport, holiday_lights, holiday_window_start, holiday_window_end });
      setNotice(r.reload_failed || "Saved.");
      load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const lights = plejdStates(hass, "light");
  const toggleLight = (id: string, on: boolean) =>
    set({ holiday_lights: on ? [...draft.holiday_lights, id] : draft.holiday_lights.filter((l) => l !== id) });

  return (
    <Card title="Settings">
      {draft.has_gateway && (
        <>
          <h3>Communication</h3>
          <label className="f"><span>Send commands via</span>
            <select value={draft.transport} onChange={(e) => set({ transport: e.target.value })}>
              {TRANSPORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </label>
          <div className="form" />
        </>
      )}
      <h3>Holiday mode</h3>
      <p className="lead">While the Holiday mode switch is on and the time is inside this window, a random subset of these lights turns on and off to make the home look lived-in. Pick none to use every Plejd light.</p>
      <div className="fields">
        <label className="f"><span>Window start</span><input type="time" value={draft.holiday_window_start} onChange={(e) => set({ holiday_window_start: e.target.value })} /></label>
        <label className="f"><span>Window end</span><input type="time" value={draft.holiday_window_end} onChange={(e) => set({ holiday_window_end: e.target.value })} /></label>
      </div>
      <span className="label" style={{ marginTop: 10 }}>Lights</span>
      <div className="checks col">
        {lights.map((s) => (
          <label key={s.entity_id}><input type="checkbox" checked={draft.holiday_lights.includes(s.entity_id)}
            onChange={(e) => toggleLight(s.entity_id, e.target.checked)} />{nameOf(s)}</label>
        ))}
        {!lights.length && <Empty text="No Plejd lights found." />}
      </div>
      {error ? <p className="error">{error}</p> : notice && <p className="notice">{notice}</p>}
      <div className="actions"><button className="btn" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save"}</button></div>
    </Card>
  );
}

type NewDevice = { address: string; name: string; rssi: number; hardware_id: string; model: string; firmware_build_time: number };

function AddDevice({ hass }: Ctx) {
  const [scan, setScan] = useState<{ bluetooth: boolean; devices: NewDevice[]; room_categories: string[] } | null>(null);
  const [picked, setPicked] = useState<NewDevice | null>(null);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const rescan = () => {
    setError(""); setNotice(""); setPicked(null);
    hass.callWS({ type: "plejd/devices/scan" }).then(setScan).catch((e: any) => setError(errMsg(e)));
  };
  const add = async () => {
    if (!picked) return;
    if (!name.trim()) { setError("Enter a name for the device."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await hass.callService("plejd", "add_device", {
        device_address: picked.address,
        name: name.trim(),
        hardware_id: picked.hardware_id,
        firmware_build_time: picked.firmware_build_time,
        ...(room.trim() ? { room_title: room.trim() } : {}),
        ...(category ? { room_category: category } : {}),
      });
      setNotice(`${name.trim()} added.`);
      setPicked(null); setName(""); setRoom(""); setCategory(""); setScan(null);
    } catch (e) {
      setError(`Failed to add the device: ${errMsg(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Add a device">
      <p className="lead">Power on a new Plejd device near a Bluetooth adapter or proxy, scan, then name it. It is registered in your Plejd account and joined to the mesh.</p>
      {scan && !scan.bluetooth && <p className="error">Bluetooth is not available on this Home Assistant instance. Add a local Bluetooth adapter or an ESPHome Bluetooth proxy (in active mode), then try again.</p>}
      {scan?.bluetooth && !scan.devices.length && <p className="muted">No unprovisioned Plejd devices found nearby. Make sure the device is powered and in Bluetooth range, then scan again.</p>}
      {scan?.devices.map((d) => (
        <label key={d.address} className="row line click">
          <input type="radio" name="new-device" checked={picked?.address === d.address} onChange={() => { setPicked(d); setName(d.name || d.model); }} />
          <span className="grow">{d.model}<div className="muted">{d.address} · RSSI {d.rssi}</div></span>
        </label>
      ))}
      {picked && (
        <div className="fields">
          <label className="f"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="f"><span>New room (optional)</span><input value={room} onChange={(e) => setRoom(e.target.value)} /></label>
          <label className="f"><span>Room category (optional)</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">(default)</option>
              {scan!.room_categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
      )}
      {error ? <p className="error">{error}</p> : notice && <p className="notice">{notice}</p>}
      <div className="actions">
        <button className={`btn ${picked ? "ghost" : ""}`} disabled={busy} onClick={rescan}>{scan ? "Scan again" : "Scan"}</button>
        {picked && <button className="btn" disabled={busy} onClick={add}>{busy ? "Adding…" : "Add device"}</button>}
      </div>
    </Card>
  );
}

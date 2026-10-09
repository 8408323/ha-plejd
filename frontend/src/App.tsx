import { createContext, useContext, useEffect, useRef, useState } from "react";
import { LANGS, T, pick } from "./i18n";
import { DEFAULT_STYLE, LAMP_STYLES, LampStyle, lampImage } from "./lamps";
import { BindingForm, PRESS_ACTIONS, PressRow, Trigger, buildBinding, buildSchedule, clampPosition, fmt, moveId, orderIds, stepTemperature, triggerLabel } from "./logic";

// Home Assistant's panel host sets `hass` (states, entity/device/area registries, callWS/callService).
type St = { entity_id: string; state: string; attributes: Record<string, any> };
type Ctx = { hass: any };
// Area/device registries, fetched once for the whole panel (hass only carries them on newer HA versions).
type Reg = { areas: Record<string, any>; devices: Record<string, any> };
type RegCtx = Ctx & { reg: Reg };

const TABS = ["devices", "automations", "settings"] as const;
type Tab = (typeof TABS)[number];
// Matches DIM_INTERVAL in dim_ramp.py: the same pacing the hold-to-dim ramp uses per tick.
const DRAG_SEND_INTERVAL_MS = 100;
const COVER_FEATURE_SET_POSITION = 4; // CoverEntityFeature.SET_POSITION
const TRANSPORTS = ["auto", "gateway", "ble"] as const;
// The panel's strings, in the language picked under Settings (or HA's).
const TCtx = createContext<T>(LANGS.en[0]);
const useT = () => useContext(TCtx);

const errMsg = (e: any) => e?.message || String(e);
const nameOf = (s: St) => s.attributes.friendly_name || s.entity_id;
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
const isPlejd = (hass: any, s: St) => hass.entities?.[s.entity_id]?.platform === "plejd" || s.attributes.attribution === "Plejd";
const plejdStates = (hass: any, domain: string, pred: (s: St) => boolean = () => true): St[] =>
  (Object.values(hass.states) as St[])
    .filter((s) => s.entity_id.startsWith(`${domain}.`) && isPlejd(hass, s) && pred(s))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
const deviceName = (reg: Reg, id: string) => reg.devices[id]?.name_by_user || reg.devices[id]?.name || id;
// A sensor's physical device name ("Hallway"), not its entity name ("Hallway Motion").
const ownerName = (hass: any, reg: Reg, s: St) => {
  const id = hass.entities?.[s.entity_id]?.device_id;
  return id ? deviceName(reg, id) : nameOf(s);
};

export default function App({ hass, narrow }: { hass: any; narrow: boolean }) {
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem("plejd_tab") as Tab) || "devices");
  const go = (x: Tab) => { setTab(x); localStorage.setItem("plejd_tab", x); };
  // Per browser, like HA's own language setting; null follows HA.
  const [lang, setLangState] = useState<string | null>(() => localStorage.getItem("plejd_lang"));
  const setLang = (x: string | null) => { setLangState(x); x ? localStorage.setItem("plejd_lang", x) : localStorage.removeItem("plejd_lang"); };
  const t = pick(hass.locale?.language ?? hass.language, lang);
  const tabLabels: Record<Tab, string> = { devices: t.tab_devices, automations: t.tab_automations, settings: t.tab_settings };
  const [fetched, setFetched] = useState<Reg | null>(null);
  useEffect(() => {
    Promise.all([hass.callWS({ type: "config/area_registry/list" }), hass.callWS({ type: "config/device_registry/list" })])
      .then(([a, d]: any[]) => setFetched({ areas: Object.fromEntries(a.map((x: any) => [x.area_id, x])), devices: Object.fromEntries(d.map((x: any) => [x.id, x])) }))
      .catch((e: any) => console.warn("Plejd panel: failed to load area/device registries", e));
  }, []);
  const ctx = { hass, reg: fetched ?? { areas: hass.areas || {}, devices: hass.devices || {} } };
  return (
    <TCtx.Provider value={t}>
    <div className={`page ${narrow ? "narrow" : ""}`} lang={t.lang}>
      <header>
        <h1>Plejd</h1>
        <nav className="tabs">
          {TABS.map((x) => <button key={x} className={tab === x ? "on" : ""} onClick={() => go(x)}>{tabLabels[x]}</button>)}
        </nav>
      </header>
      {tab === "devices" && (
        <div className="grid">
          <div className="rooms"><Lights {...ctx} /></div>
          <Scenes {...ctx} /><Climate {...ctx} /><Covers {...ctx} /><Motion {...ctx} /><Health {...ctx} />
        </div>
      )}
      {tab === "automations" && <div className="grid"><Schedules {...ctx} /><Bindings {...ctx} /></div>}
      {tab === "settings" && <div className="grid"><Settings {...ctx} /><Language lang={lang} setLang={setLang} /><AddDevice {...ctx} /></div>}
    </div>
    </TCtx.Provider>
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

type Room = { room_id: string; name: string; entity_id: string | null; lights: string[] };

// Lights grouped by their Plejd room, as in the app. The room header drives the room's own group light
// (one mesh command for the whole room); inside, each light is a tile drawn as its configured lamp.
function Lights({ hass }: Ctx) {
  const t = useT();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [styles, setStyles] = useState<Record<string, LampStyle>>({});
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  // Edit mode: everything is a draft until Save; Cancel drops it.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const [layout, setLayout] = useState<{ order: string[]; sizes: Record<string, number> }>({ order: [], sizes: {} });
  // Editing needs the saved layout: a draft started from the defaults would overwrite it on Save.
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  // Bumped by plejd_rooms_changed (fired on every Plejd entry setup: room renames/moves, site syncs).
  const [roomsVersion, setRoomsVersion] = useState(0);
  useEffect(() => {
    const sub = hass.connection.subscribeEvents(() => setRoomsVersion((v) => v + 1), "plejd_rooms_changed");
    return () => { sub.then((unsub: () => void) => unsub()).catch(() => {}); };
  }, []);
  // The server's last confirmed styles, and a per-light counter so only the newest save's failure rolls back.
  const confirmed = useRef<Record<string, LampStyle>>({});
  const saveSeq = useRef<Record<string, number>>({});
  // Bumped on every lamp-type edit: a style read that started before an edit is stale once it lands.
  const edits = useRef(0);
  // Saves still in flight: a read started or answered meanwhile may not include them yet.
  const pendingSaves = useRef(0);
  // Plejd may still be starting or reloading (the panel registers before its commands do): keep
  // retrying instead of treating a failure as "no rooms", which would lump every light together.
  // Reloaded whenever HA's entity registry changes (hass.entities is replaced only then), so a
  // renamed entity_id stays in its room and keeps its lamp type.
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let styleTimer = 0;
    const load = () => hass.callWS({ type: "plejd/rooms" })
      .then((r: any) => { if (!cancelled) { setRooms(r.rooms); setError(""); } })
      .catch((e: any) => { if (!cancelled) { setError(errMsg(e)); timer = window.setTimeout(load, 5000); } });
    // Lamp styles are cosmetic and load on their own: until they do, every lamp keeps the default look.
    const loadStyles = () => {
      const startedAt = edits.current;
      const startedDuringSave = pendingSaves.current > 0;
      return hass.callWS({ type: "plejd/light_styles/get" })
        .then((r: any) => {
          if (cancelled) return;
          // An edit or save overlapped this read, so it may predate that write: read again once things
          // settle instead (the rollback of a failed edit needs a confirmed baseline to fall back to).
          if (edits.current !== startedAt || startedDuringSave || pendingSaves.current > 0) {
            styleTimer = window.setTimeout(loadStyles, 1000);
            return;
          }
          confirmed.current = r.styles || {};
          setStyles(confirmed.current);
        })
        .catch((e: any) => {
          if (cancelled) return;
          console.warn("Plejd panel: could not load lamp types, retrying", e);
          styleTimer = window.setTimeout(loadStyles, 5000);
        });
    };
    load();
    loadStyles();
    // Card order/sizes are cosmetic: until they load, the cards use their natural order and size.
    let layoutTimer = 0;
    const loadLayout = () => hass.callWS({ type: "plejd/room_layout/get" })
      .then((r: any) => { if (!cancelled) { setLayout(r); setLayoutLoaded(true); } })
      .catch((e: any) => {
        if (cancelled) return;
        console.warn("Plejd panel: could not load the card layout, retrying", e);
        layoutTimer = window.setTimeout(loadLayout, 5000);
      });
    loadLayout();
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(styleTimer); clearTimeout(layoutTimer); };
  }, [hass.entities, roomsVersion]);
  const setStyle = (entity_id: string, style: LampStyle): Promise<void> => {
    edits.current++;
    pendingSaves.current++;
    const seq = (saveSeq.current[entity_id] = (saveSeq.current[entity_id] || 0) + 1);
    const latest = () => saveSeq.current[entity_id] === seq;
    setStyles((cur) => ({ ...cur, [entity_id]: style }));
    return hass.callWS({ type: "plejd/light_styles/set", entity_id, style })
      .then((r: any) => {
        confirmed.current = r.styles;
        // An older save finishing after a newer pick must not overwrite that pick on screen.
        setStyles((cur) => (latest() ? r.styles : { ...r.styles, [entity_id]: cur[entity_id] }));
        setSaveError("");
      })
      .catch((e: any) => {
        if (!latest()) return; // a newer pick is in flight; it decides what this lamp shows
        // Not saved: put the lamp back to what the server last confirmed.
        setStyles((cur) => {
          const next = { ...cur };
          if (confirmed.current[entity_id]) next[entity_id] = confirmed.current[entity_id];
          else delete next[entity_id];
          return next;
        });
        setSaveError(fmt(t.lamp_save_failed, { error: errMsg(e) }));
        throw e;
      })
      .finally(() => { pendingSaves.current--; });
  };

  const lights = plejdStates(hass, "light");
  if (rooms === null) return <Card title={t.lights} wide><Empty text={error ? fmt(t.waiting, { error }) : t.loading} /></Card>;
  const roomLights = new Set(rooms.map((r) => r.entity_id));
  const grouped = new Set(rooms.flatMap((r) => r.lights));
  const others = lights.filter((s) => !roomLights.has(s.entity_id) && !grouped.has(s.entity_id)).map((s) => s.entity_id);
  const all: Room[] = [...rooms.filter((r) => r.lights.length), ...(others.length ? [{ room_id: "", name: rooms.length ? t.other_lights : t.lights, entity_id: null, lights: others }] : [])];
  const view = draft ?? { order: layout.order, sizes: layout.sizes };
  const byId = Object.fromEntries(all.map((r) => [r.room_id, r]));
  const cards = orderIds(all.map((r) => r.room_id), view.order).map((id) => byId[id]);
  const sizeOf = (r: Room) => view.sizes[r.room_id] ?? (r.lights.length > 3 ? 2 : 1);

  const startEdit = () => {
    const nameOf_ = (id: string) => nameOf(hass.states[id] ?? { entity_id: id, state: "", attributes: {} });
    const start = {
      order: cards.map((r) => r.room_id),
      sizes: Object.fromEntries(cards.map((r) => [r.room_id, sizeOf(r)])),
      roomNames: Object.fromEntries(rooms.map((r) => [r.room_id, r.name])),
      lightNames: Object.fromEntries(all.flatMap((r) => r.lights).map((id) => [id, nameOf_(id)])),
      styles: { ...styles },
    };
    // Only fields that differ from this snapshot are saved: a name changed elsewhere meanwhile isn't undone.
    setDraft({ ...start, base: start });
    setSaveError("");
  };
  const saveEdit = async () => {
    if (!draft) return;
    const { base } = draft;
    const changed = <K extends string>(now: Record<K, string>, was: Record<K, string>) =>
      (Object.keys(now) as K[]).filter((k) => now[k] !== was[k]);
    const lightRenames = changed(draft.lightNames, base.lightNames);
    const roomRenames = changed(draft.roomNames, base.roomNames);
    if ([...lightRenames.map((k) => draft.lightNames[k]), ...roomRenames.map((k) => draft.roomNames[k])].some((n) => !n.trim())) {
      setSaveError(t.err_blank_name);
      return;
    }
    setBusy(true);
    setSaveError("");
    const errors: string[] = [];
    const attempt = async (job: () => Promise<unknown>) => { try { await job(); } catch (e) { errors.push(errMsg(e)); } };
    const layoutChanged = JSON.stringify([draft.order, draft.sizes]) !== JSON.stringify([base.order, base.sizes]);
    // Cosmetic and local: in parallel.
    await Promise.all([
      ...(layoutChanged ? [attempt(() => hass.callWS({ type: "plejd/room_layout/set", order: draft.order, sizes: draft.sizes }).then((r: any) => setLayout(r)))] : []),
      ...Object.entries(draft.styles)
        .filter(([id, style]) => style !== (base.styles[id] ?? DEFAULT_STYLE))
        .map(([id, style]) => attempt(() => setStyle(id, style))),
    ]);
    // Renames write to the Plejd cloud: one at a time, lights before rooms (a room rename reloads the
    // integration, and a light rename can't run while it does).
    for (const id of lightRenames) await attempt(() => hass.callWS({ type: "plejd/lights/rename", entity_id: id, name: draft.lightNames[id].trim() }));
    for (const id of roomRenames) await attempt(() => hass.callService("plejd", "update_room", { room_id: id, title: draft.roomNames[id].trim() }));
    setBusy(false);
    if (errors.length) setSaveError(fmt(t.edit_save_failed, { error: errors.join("; ") }));
    else setDraft(null);
  };
  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const edit = draft && {
    draft,
    patch,
    move: (id: string, to: number) => patch({ order: moveId(draft.order, id, to) }),
    drag,
    setDrag,
  };

  return (
    <>
      <div className="rooms-bar">
        <h2 className="grow">{t.lights}</h2>
        {draft ? (
          <>
            <span className="muted">{t.edit_hint}</span>
            <button className="btn ghost" disabled={busy} onClick={() => { setDraft(null); setSaveError(""); }}>{t.cancel}</button>
            <button className="btn" disabled={busy} onClick={saveEdit}>{busy ? t.saving : t.save}</button>
          </>
        ) : (
          <button className="btn ghost" onClick={startEdit} disabled={!layoutLoaded} aria-label={t.edit_lights}>✎ {t.edit}</button>
        )}
      </div>
      {saveError && <Card title={t.lights} wide><p className="error">{saveError}</p></Card>}
      {cards.map((r, i) => <RoomCard key={r.room_id || "other"} hass={hass} room={r} index={i} count={cards.length} size={sizeOf(r)}
        styles={draft?.styles ?? styles} edit={edit || null} />)}
      {!cards.length && <Card title={t.lights} wide><Empty text={t.no_lights} /></Card>}
    </>
  );
}

type DraftFields = { order: string[]; sizes: Record<string, number>; roomNames: Record<string, string>; lightNames: Record<string, string>; styles: Record<string, LampStyle> };
type Draft = DraftFields & { base: DraftFields }; // base: the values when editing started
type Edit = { draft: Draft; patch: (p: Partial<Draft>) => void; move: (id: string, to: number) => void; drag: string | null; setDrag: (id: string | null) => void };

function RoomCard({ hass, room, index, count, size, styles, edit }: Ctx & {
  room: Room; index: number; count: number; size: number; styles: Record<string, LampStyle>; edit: Edit | null;
}) {
  const t = useT();
  const members = room.lights.map((id) => hass.states[id] as St | undefined).filter(Boolean) as St[];
  const onCount = members.filter((s) => s.state === "on").length;
  const roomState = room.entity_id ? (hass.states[room.entity_id] as St | undefined) : undefined;
  const id = room.room_id;
  // Desktop: drag a card onto another to take its place. Touch/keyboard: the arrow buttons.
  const dnd = edit ? {
    draggable: true,
    onDragStart: (e: React.DragEvent) => { e.dataTransfer.effectAllowed = "move"; edit.setDrag(id); },
    onDragEnd: () => edit.setDrag(null),
    onDragOver: (e: React.DragEvent) => { if (edit.drag !== null && edit.drag !== id) e.preventDefault(); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); if (edit.drag !== null) edit.move(edit.drag, edit.draft.order.indexOf(id)); edit.setDrag(null); },
  } : {};
  return (
    <section className={`card room size-${size} ${edit ? "editing" : ""} ${edit?.drag === id ? "dragging" : ""}`} {...dnd}>
      <div className="room-head">
        {edit && <span className="handle" aria-hidden="true">⠿</span>}
        <div className="grow">
          {edit && id ? (
            <input className="name-input" value={edit.draft.roomNames[id] ?? room.name} aria-label={fmt(t.rename, { name: room.name })}
              onChange={(e) => edit.patch({ roomNames: { ...edit.draft.roomNames, [id]: e.target.value } })} />
          ) : <h2>{room.name}</h2>}
          {!edit && <span className="muted">{onCount ? fmt(t.on_count, { on: onCount, total: members.length }) : t.all_off}</span>}
        </div>
        {edit ? (
          <div className="edit-tools">
            <button className="icon" disabled={index === 0} aria-label={fmt(t.move_earlier, { name: room.name })} onClick={() => edit.move(id, index - 1)}>◀</button>
            <button className="icon" disabled={index === count - 1} aria-label={fmt(t.move_later, { name: room.name })} onClick={() => edit.move(id, index + 1)}>▶</button>
            <div className="seg" role="radiogroup" aria-label={t.card_size}>
              {[1, 2, 3].map((n) => (
                <button key={n} role="radio" aria-checked={size === n} className={size === n ? "on" : ""}
                  onClick={() => edit.patch({ sizes: { ...edit.draft.sizes, [id]: n } })}>{t.sizes[n - 1]}</button>
              ))}
            </div>
          </div>
        ) : roomState ? <RoomControl hass={hass} s={roomState} /> : <GroupSwitch hass={hass} members={members} name={room.name} />}
      </div>
      <div className="tiles">
        {members.map((s) => <LightTile key={s.entity_id} hass={hass} s={s} style={styles[s.entity_id] ?? DEFAULT_STYLE} edit={edit} />)}
      </div>
    </section>
  );
}

// The Plejd room light: a switch, plus a slider when any member dims.
function RoomControl({ hass, s }: Ctx & { s: St }) {
  const t = useT();
  const l = useLight(hass, s);
  return (
    <div className="room-control">
      {l.dimmable && <input type="range" min={1} max={100} value={l.pct} disabled={l.unavailable} className={l.on ? "" : "idle"}
        aria-label={fmt(t.brightness, { name: nameOf(s) })} onChange={(e) => l.slide(Number(e.target.value))} />}
      <button type="button" role="switch" aria-checked={l.on} aria-label={fmt(l.on ? t.turn_off : t.turn_on, { name: nameOf(s) })}
        className={`switch ${l.on ? "on" : ""}`} disabled={l.unavailable} onClick={l.toggle} />
    </div>
  );
}

// Lights outside any Plejd room have no group light; switch them together with one service call.
function GroupSwitch({ hass, members, name }: Ctx & { members: St[]; name: string }) {
  const t = useT();
  const on = members.some((s) => s.state === "on");
  const toggle = () => hass.callService("light", on ? "turn_off" : "turn_on", { entity_id: members.map((s) => s.entity_id) })
    .catch((e: any) => console.warn("Plejd panel: failed to switch", name, e));
  return <button type="button" role="switch" aria-checked={on} aria-label={fmt(on ? t.turn_off : t.turn_on, { name })} className={`switch ${on ? "on" : ""}`} onClick={toggle} />;
}

function LightTile({ hass, s, style, edit }: Ctx & { s: St; style: LampStyle; edit: Edit | null }) {
  const t = useT();
  const l = useLight(hass, s);
  const id = s.entity_id;
  return (
    <div className={`tile ${l.on ? "lit" : ""} ${l.unavailable ? "off" : ""}`}>
      {/* No switching while editing: a tap there is meant for the fields, not the light. */}
      <button className="lamp" onClick={l.toggle} disabled={l.unavailable || !!edit} aria-label={fmt(l.on ? t.turn_off : t.turn_on, { name: nameOf(s) })}>
        <img src={lampImage(style, l.on ? (l.dimmable ? l.pct / 100 : 1) : 0)} alt="" draggable={false} />
      </button>
      {edit ? (
        <>
          <input className="name-input small" value={edit.draft.lightNames[id] ?? nameOf(s)} aria-label={fmt(t.rename, { name: nameOf(s) })}
            onChange={(e) => edit.patch({ lightNames: { ...edit.draft.lightNames, [id]: e.target.value } })} />
          <select value={style} aria-label={fmt(t.lamp_type_for, { name: nameOf(s) })}
            onChange={(e) => edit.patch({ styles: { ...edit.draft.styles, [id]: e.target.value as LampStyle } })}>
            {LAMP_STYLES.map((st) => <option key={st} value={st}>{t.lamps[st]}</option>)}
          </select>
        </>
      ) : (
        <>
          <div className="tile-name" title={nameOf(s)}>{nameOf(s)}</div>
          <div className="muted">{l.level}</div>
          {l.dimmable && <input type="range" min={1} max={100} value={l.pct} disabled={l.unavailable} className={l.on ? "" : "idle"}
            aria-label={fmt(t.brightness, { name: nameOf(s) })} onChange={(e) => l.slide(Number(e.target.value))} />}
        </>
      )}
    </div>
  );
}

// Optimistic on/brightness until hass's own push catches up: a repeated click lands well within the
// round-trip, so reading hass.states would resend the pre-click state instead of alternating.
function useLight(hass: any, s: St) {
  const t = useT();
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
  const send = useRef({ sending: false, queued: null as number | null, last: 0, timer: 0, pending: null as number | null });
  useEffect(() => { if (onOverride === realOn) setOnOverride(null); }, [realOn, onOverride]);
  useEffect(() => { if (pctOverride === realPct) setPctOverride(null); }, [realPct, pctOverride]);
  // Leaving mid-drag (tab switch, navigation) must still send the last value the throttle was holding back.
  const flush = useRef<() => void>(() => {});
  useEffect(() => () => flush.current(), []);

  const on = onOverride ?? realOn;
  const pct = pctOverride ?? realPct;
  const dimmable = Array.isArray(s.attributes.supported_color_modes) ? s.attributes.supported_color_modes.includes("brightness") : bri != null;
  const level = unavailable ? t.state_unavailable : on && bri != null ? `${pct}%` : on ? t.state_on : t.state_off;

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
    st.pending = p;
    const fire = () => { st.last = Date.now(); st.pending = null; sendPct(p); };
    if (wait <= 0) fire();
    else st.timer = window.setTimeout(fire, wait);
  };
  flush.current = () => {
    clearTimeout(send.current.timer);
    if (send.current.pending !== null) sendPct(send.current.pending);
  };
  return { on, pct, dimmable, level, unavailable, toggle, slide };
}

function Climate({ hass }: Ctx) {
  const t = useT();
  const climates = plejdStates(hass, "climate");
  return (
    <Card title={t.climate} count={climates.length}>
      {climates.map((s) => <ClimateRow key={s.entity_id} hass={hass} s={s} />)}
      {!climates.length && <Empty text={t.no_climate} />}
    </Card>
  );
}

function ClimateRow({ hass, s }: Ctx & { s: St }) {
  const t = useT();
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
      <button className="btn small" disabled={disabled} onClick={() => step(-1)} aria-label={t.temp_down}>−</button>
      <span className="temp">{target != null ? `${target}°C` : "—"}</span>
      <button className="btn small" disabled={disabled} onClick={() => step(1)} aria-label={t.temp_up}>+</button>
    </div>
  );
}

function Covers({ hass }: Ctx) {
  const t = useT();
  const covers = plejdStates(hass, "cover");
  return (
    <Card title={t.covers} count={covers.length}>
      {covers.map((s) => <CoverRow key={s.entity_id} hass={hass} s={s} />)}
      {!covers.length && <Empty text={t.no_covers} />}
    </Card>
  );
}

function CoverRow({ hass, s }: Ctx & { s: St }) {
  const t = useT();
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
  // Send once per committed value: the native "change" event (pointer release, key step, assistive tech),
  // not React's onChange, which fires on every drag tick.
  const slider = useRef<HTMLInputElement>(null);
  const commit = useRef(() => {});
  commit.current = () => {
    const p = Number(slider.current!.value);
    command("set_cover_position", { position: p }, p);
    setDrag(null);
  };
  useEffect(() => {
    const el = slider.current;
    const onCommit = () => commit.current();
    el?.addEventListener("change", onCommit);
    return () => el?.removeEventListener("change", onCommit);
  }, [canSetPosition]);

  return (
    <div className="row">
      <div className="line">
        <span className="grow">{nameOf(s)}</span>
        <span className="count">{unavailable ? t.state_unavailable : position != null ? `${position}%` : ({ open: t.cover_open, closed: t.cover_closed, opening: t.cover_opening, closing: t.cover_closing, unknown: t.cover_unknown } as Record<string, string>)[s.state] ?? s.state}</span>
      </div>
      <div className="line" style={{ marginTop: 8 }}>
        <button className="btn" disabled={unavailable} onClick={() => command("open_cover", {}, 100)}>{t.open}</button>
        <button className="btn ghost" disabled={unavailable} onClick={() => command("stop_cover", {}, null)}>{t.stop}</button>
        <button className="btn" disabled={unavailable} onClick={() => command("close_cover", {}, 0)}>{t.close}</button>
        {canSetPosition && <input ref={slider} type="range" min={0} max={100} value={drag ?? known ?? 50} disabled={unavailable}
          aria-label={fmt(t.position, { name: nameOf(s) })} onChange={(e) => setDrag(Number(e.target.value))} onPointerCancel={() => setDrag(null)} />}
      </div>
    </div>
  );
}

function Scenes({ hass }: Ctx) {
  const t = useT();
  const scenes = plejdStates(hass, "scene");
  const [error, setError] = useState("");
  const activate = (id: string) => {
    setError("");
    hass.callService("scene", "turn_on", { entity_id: id }).catch((e: any) => setError(fmt(t.scene_failed, { error: errMsg(e) })));
  };
  return (
    <Card title={t.scenes} count={scenes.length}>
      {scenes.map((s) => (
        <div key={s.entity_id} className="row line">
          <span className="grow">{nameOf(s)}</span>
          <button className="btn" onClick={() => activate(s.entity_id)}>{t.activate}</button>
        </div>
      ))}
      {!scenes.length && <Empty text={t.no_scenes} />}
      {error && <p className="error">{error}</p>}
    </Card>
  );
}

function Motion({ hass, reg }: RegCtx) {
  const t = useT();
  const sensors = plejdStates(hass, "binary_sensor", (s) => s.attributes.device_class === "motion");
  const lux = (s: St) => {
    const deviceId = hass.entities?.[s.entity_id]?.device_id;
    const sensor = deviceId && (Object.values(hass.states) as St[]).find((x) =>
      x.entity_id.startsWith("sensor.") && x.attributes.device_class === "illuminance" && hass.entities?.[x.entity_id]?.device_id === deviceId);
    return sensor && !["unavailable", "unknown"].includes(sensor.state) ? ` · ${sensor.state} lx` : "";
  };
  return (
    <Card title={t.motion} count={sensors.length}>
      {sensors.map((s) => (
        <div key={s.entity_id} className="row line">
          <span className={`dot ${s.state === "on" ? "on" : ""}`} />
          <span className="grow">{ownerName(hass, reg, s)}</span>
          <span className="count">{["unavailable", "unknown"].includes(s.state) ? t.unavailable : s.state === "on" ? t.detected : t.clear}{lux(s)}</span>
        </div>
      ))}
      {!sensors.length && <Empty text={t.no_motion} />}
    </Card>
  );
}

function Health({ hass, reg }: RegCtx) {
  const t = useT();
  const faulted = plejdStates(hass, "binary_sensor", (s) => s.attributes.device_class === "problem" && s.state === "on")
    .map((s) => ({ id: s.entity_id, name: ownerName(hass, reg, s), flags: (s.attributes.active_faults || []).map((f: string) => t.faults[f] ?? f.replace(/_/g, " ")).join(", ") }))
    .sort(byName);
  return (
    <Card title={t.health} count={faulted.length}>
      {faulted.map((f) => (
        <div key={f.id} className="row line"><span className="dot bad" /><span className="grow">{f.name}</span><span className="count">{f.flags}</span></div>
      ))}
      {!faulted.length && <Empty text={t.all_healthy} />}
    </Card>
  );
}

// ── automations ─────────────────────────────────────────────────────────────

type Schedule = { id: number; name: string; days: number[]; time: string; scene: number; fade: number };
const EMPTY_SCHEDULE = { name: "", days: [] as number[], time: "07:00", scene: "", fade: "0" };

function Schedules({ hass }: Ctx) {
  const t = useT();
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
      .catch((e: any) => setLoadError(fmt(t.schedules_load_failed, { error: errMsg(e) })));
  };
  useEffect(load, []);

  const run = async (msg: Record<string, any>, after?: () => void) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await hass.callWS(msg);
      setList(r.schedules || []);
      // Saved, but the entry didn't reload: the on-device event may not match yet, so say so.
      setNotice(r.reload_failed || (after ? t.saved : ""));
      after?.();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const add = () => {
    let payload;
    try { payload = buildSchedule(form, t); } catch (e) { setError(errMsg(e)); setNotice(""); return; }
    run({ type: "plejd/schedules/add", ...payload }, () => setForm(EMPTY_SCHEDULE));
  };
  const sceneName = (i: number) => scenes.find((s) => s.index === i)?.name || fmt(t.scene_n, { n: i });
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  return (
    <Card title={t.schedules} wide>
      <p className="lead">{t.schedules_lead}</p>
      {list === null ? (
        loadError ? <><p className="error">{loadError}</p><div className="actions"><button className="btn" onClick={load}>{t.retry}</button></div></> : <Empty text={t.loading} />
      ) : (
        <>
          {list.map((s) => (
            <div key={s.id} className="row line">
              <div className="grow">
                <div>{s.name}</div>
                <div className="muted">{s.days?.length ? s.days.map((d) => t.weekdays[d]).join(", ") : "—"} · {s.time} · {sceneName(s.scene)}{s.fade ? ` · ${fmt(t.fade_s, { n: s.fade })}` : ""}</div>
              </div>
              <button className="btn danger" disabled={busy} onClick={() => run({ type: "plejd/schedules/delete", schedule_id: s.id })}>{t.delete}</button>
            </div>
          ))}
          {!list.length && <Empty text={t.no_schedules} />}
          <div className="form">
            <h3>{t.add_schedule_title}</h3>
            <div className="fields">
              <label className="f"><span>{t.name}</span><input value={form.name} placeholder={t.name_placeholder} onChange={(e) => set({ name: e.target.value })} /></label>
              <label className="f"><span>{t.scene}</span>
                <select value={form.scene} onChange={(e) => set({ scene: e.target.value })}>
                  <option value="">{t.select_scene}</option>
                  {scenes.map((s) => <option key={s.index} value={s.index}>{s.name}</option>)}
                </select>
              </label>
              <label className="f"><span>{t.time}</span><input type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} /></label>
              <label className="f"><span>{t.fade_optional}</span><input type="number" min={0} value={form.fade} onChange={(e) => set({ fade: e.target.value })} /></label>
            </div>
            <span className="label" style={{ marginTop: 10 }}>{t.days}</span>
            <div className="checks">
              {t.weekdays.map((label, i) => (
                <label key={i}><input type="checkbox" checked={form.days.includes(i)}
                  onChange={(e) => set({ days: e.target.checked ? [...form.days, i] : form.days.filter((d) => d !== i) })} />{label}</label>
              ))}
            </div>
            {error ? <p className="error">{error}</p> : notice && <p className="notice">{notice}</p>}
            <div className="actions"><button className="btn" disabled={busy} onClick={add}>{busy ? t.saving : t.add_schedule}</button></div>
          </div>
        </>
      )}
    </Card>
  );
}

type DeviceTriggers = { triggers: Trigger[]; kind: string };
const EMPTY_BINDING: BindingForm = { target: "", device: "", up: "", down: "", stop: "", presses: [] };
const EMPTY_PRESS: PressRow = { trigger: "", type: "", entity_id: "", domain: "", service: "", data: "" };

function Bindings({ hass, reg }: RegCtx) {
  const t = useT();
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
      .catch((e: any) => setLoadError(fmt(t.bindings_load_failed, { error: errMsg(e) })));
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
      setError(fmt(t.triggers_load_failed, { error: errMsg(e) }));
    }
  };
  const save = async (bindings: any[], resetForm: boolean) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await hass.callWS({ type: "plejd/dim_bindings/save", bindings });
      setList(r.bindings || []);
      setNotice(t.saved);
      if (resetForm) setForm(EMPTY_BINDING); // a delete must not wipe an in-progress add
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const add = () => {
    try {
      save([...list!, buildBinding(form, triggers[form.device]?.triggers || [], t)], true);
    } catch (e) {
      setError(errMsg(e)); setNotice("");
    }
  };

  const areaName = (id: string) => reg.areas[id]?.name || id;
  const entityName = (id: string) => hass.states[id]?.attributes.friendly_name || id;
  const targetName = (b: any) => {
    const tg = b.targets || {};
    const names = [
      ...[].concat(tg.entity_id || []).map(entityName),
      ...[].concat(tg.area_id || []).map(areaName),
      ...[].concat(tg.device_id || []).map((id: string) => deviceName(reg, id)),
    ];
    return names.length ? names.join(", ") : "—";
  };
  const summary = (b: any) => {
    const dirs: Record<string, string> = { up: t.sum_up, down: t.sum_down, stop: t.sum_stop };
    const parts = [["up", "down", "stop"].filter((k) => b[k]).map((k) => dirs[k]).join(" / ")].filter(Boolean);
    const n = (b.presses || []).length;
    if (n) parts.push(n === 1 ? t.press_count_one : fmt(t.press_count, { n }));
    const remote = (b.up || b.down || b.stop || b.presses?.[0]?.trigger)?.device_id;
    return `${remote ? deviceName(reg, remote) : "—"} · ${parts.join(", ") || "—"}`;
  };

  const lights = (Object.values(hass.states) as St[]).filter((s) => s.entity_id.startsWith("light."))
    .map((s) => ({ id: s.entity_id, name: nameOf(s) })).sort(byName);
  const areas = Object.values(reg.areas).map((a: any) => ({ id: a.area_id, name: a.name || a.area_id })).sort(byName);
  const devices = Object.values(reg.devices).map((d: any) => ({ id: d.id, name: d.name_by_user || d.name })).filter((d) => d.name).sort(byName);
  const allScenes = (Object.values(hass.states) as St[]).filter((s) => s.entity_id.startsWith("scene."))
    .map((s) => ({ id: s.entity_id, name: nameOf(s) })).sort(byName);
  const dev = triggers[form.device];
  const kind = dev?.kind || "remote";
  const triggerOptions = (
    <><option value="">{t.none_opt}</option>{(dev?.triggers || []).map((tr, i) => <option key={i} value={i}>{triggerLabel(tr, t)}</option>)}</>
  );
  const pressLabels: Record<string, string> = { toggle: t.press_toggle, on: t.press_on, off: t.press_off, scene: t.press_scene, service: t.press_service };
  const setPress = (i: number, patch: Partial<PressRow>) =>
    setForm({ ...form, presses: form.presses.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <Card title={t.bindings} wide>
      <p className="lead">{t.bindings_lead}</p>
      {list === null ? (
        loadError ? <><p className="error">{loadError}</p><div className="actions"><button className="btn" onClick={load}>{t.retry}</button></div></> : <Empty text={t.loading} />
      ) : (
        <>
          {list.map((b) => (
            <div key={b.id} className="row line">
              <div className="grow"><div>{targetName(b)}</div><div className="muted">{summary(b)}</div></div>
              <button className="btn danger" disabled={busy} onClick={() => save(list.filter((x) => String(x.id) !== String(b.id)), false)}>{t.delete}</button>
            </div>
          ))}
          {!list.length && <Empty text={t.no_bindings} />}
          <div className="form">
            <h3>{t.add_binding_title}</h3>
            <div className="fields">
              <label className="f"><span>{t.light_or_room}</span>
                <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                  <option value="">{t.select_target}</option>
                  <optgroup label={t.lights}>{lights.map((l) => <option key={l.id} value={`light:${l.id}`}>{l.name}</option>)}</optgroup>
                  <optgroup label={t.rooms}>{areas.map((a) => <option key={a.id} value={`area:${a.id}`}>{a.name}</option>)}</optgroup>
                </select>
              </label>
              <label className="f"><span>{t.remote}</span>
                <select value={form.device} onChange={(e) => pickDevice(e.target.value)}>
                  <option value="">{t.select_remote}</option>
                  {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
            </div>
            {form.device && (
              <>
                {kind === "remote" ? (
                  <div className="fields">
                    <label className="f"><span>{t.dim_up}</span><select value={form.up} onChange={(e) => setForm({ ...form, up: e.target.value })}>{triggerOptions}</select></label>
                    <label className="f"><span>{t.dim_down}</span><select value={form.down} onChange={(e) => setForm({ ...form, down: e.target.value })}>{triggerOptions}</select></label>
                    <label className="f"><span>{t.release}</span><select value={form.stop} onChange={(e) => setForm({ ...form, stop: e.target.value })}>{triggerOptions}</select></label>
                  </div>
                ) : (
                  <p className="muted">{kind === "door_window" ? t.sensor_door : t.sensor_motion}</p>
                )}
                {dev && !dev.triggers.length && <p className="muted">{t.no_triggers}</p>}
                <div className="line" style={{ marginTop: 14 }}>
                  <span className="label grow" style={{ margin: 0 }}>{t.press_actions}</span>
                  <button className="btn" onClick={() => setForm({ ...form, presses: [...form.presses, EMPTY_PRESS] })}>{t.add_press}</button>
                </div>
                {form.presses.map((p, i) => (
                  <div key={i} className="box">
                    <div className="fields press" style={{ marginTop: 0 }}>
                      <label className="f"><span>{t.trigger}</span><select value={p.trigger} onChange={(e) => setPress(i, { trigger: e.target.value })}>{triggerOptions}</select></label>
                      <label className="f"><span>{t.action}</span>
                        <select value={p.type} onChange={(e) => setPress(i, { type: e.target.value })}>
                          <option value="">{t.select_action}</option>
                          {PRESS_ACTIONS.map((a) => <option key={a} value={a}>{pressLabels[a]}</option>)}
                        </select>
                      </label>
                      <button className="btn danger" aria-label={t.remove_press} onClick={() => setForm({ ...form, presses: form.presses.filter((_, j) => j !== i) })}>✕</button>
                    </div>
                    {p.type === "scene" && (
                      <label className="f" style={{ marginTop: 8 }}><span>{t.scene}</span>
                        <select value={p.entity_id} onChange={(e) => setPress(i, { entity_id: e.target.value })}>
                          <option value="">{t.select_scene}</option>
                          {allScenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </label>
                    )}
                    {p.type === "service" && (
                      <>
                        <div className="fields">
                          <label className="f"><span>{t.domain}</span><input value={p.domain} placeholder="light" onChange={(e) => setPress(i, { domain: e.target.value })} /></label>
                          <label className="f"><span>{t.service}</span><input value={p.service} placeholder="turn_on" onChange={(e) => setPress(i, { service: e.target.value })} /></label>
                        </div>
                        <label className="f" style={{ marginTop: 8 }}><span>{t.data_json}</span><textarea value={p.data} onChange={(e) => setPress(i, { data: e.target.value })} /></label>
                      </>
                    )}
                  </div>
                ))}
                {!form.presses.length && <p className="muted">{t.no_presses}</p>}
              </>
            )}
            {error ? <p className="error">{error}</p> : notice && <p className="notice">{notice}</p>}
            <div className="actions"><button className="btn" disabled={busy} onClick={add}>{busy ? t.saving : t.add_binding}</button></div>
          </div>
        </>
      )}
    </Card>
  );
}

// ── settings ────────────────────────────────────────────────────────────────

type SettingsData = { transport: string; has_gateway: boolean; holiday_lights: string[]; holiday_window_start: string; holiday_window_end: string };

function Settings({ hass }: Ctx) {
  const t = useT();
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
      .catch((e: any) => setLoadError(fmt(t.settings_load_failed, { error: errMsg(e) })));
  };
  useEffect(load, []);

  if (!draft || !saved) {
    return (
      <Card title={t.settings}>
        {loadError ? <><p className="error">{loadError}</p><div className="actions"><button className="btn" onClick={load}>{t.retry}</button></div></> : <Empty text={t.loading} />}
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
      setNotice(r.reload_failed || t.saved);
      load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  // Holiday mode can drive any HA light, not just Plejd ones; none picked = every Plejd light.
  const lights = (Object.values(hass.states) as St[]).filter((s) => s.entity_id.startsWith("light.")).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const toggleLight = (id: string, on: boolean) =>
    set({ holiday_lights: on ? [...draft.holiday_lights, id] : draft.holiday_lights.filter((l) => l !== id) });

  return (
    <Card title={t.settings}>
      {draft.has_gateway && (
        <>
          <h3>{t.communication}</h3>
          <label className="f"><span>{t.send_via}</span>
            <select value={draft.transport} onChange={(e) => set({ transport: e.target.value })}>
              {TRANSPORTS.map((v) => <option key={v} value={v}>{t[`transport_${v}`]}</option>)}
            </select>
          </label>
          <div className="form" />
        </>
      )}
      <h3>{t.holiday}</h3>
      <p className="lead">{t.holiday_lead}</p>
      <div className="fields">
        <label className="f"><span>{t.window_start}</span><input type="time" value={draft.holiday_window_start} onChange={(e) => set({ holiday_window_start: e.target.value })} /></label>
        <label className="f"><span>{t.window_end}</span><input type="time" value={draft.holiday_window_end} onChange={(e) => set({ holiday_window_end: e.target.value })} /></label>
      </div>
      <span className="label" style={{ marginTop: 10 }}>{t.lights}</span>
      <div className="checks col">
        {lights.map((s) => (
          <label key={s.entity_id}><input type="checkbox" checked={draft.holiday_lights.includes(s.entity_id)}
            onChange={(e) => toggleLight(s.entity_id, e.target.checked)} />{nameOf(s)}</label>
        ))}
        {!lights.length && <Empty text={t.no_lights} />}
      </div>
      {error ? <p className="error">{error}</p> : notice && <p className="notice">{notice}</p>}
      <div className="actions"><button className="btn" disabled={busy || !dirty} onClick={save}>{busy ? t.saving : t.save}</button></div>
    </Card>
  );
}

type NewDevice = { address: string; name: string; rssi: number; hardware_id: string; model: string; firmware_build_time: number };

function AddDevice({ hass }: Ctx) {
  const t = useT();
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
    if (!name.trim()) { setError(t.enter_name); return; }
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
      setNotice(fmt(t.device_added, { name: name.trim() }));
      setPicked(null); setName(""); setRoom(""); setCategory(""); setScan(null);
    } catch (e) {
      setError(fmt(t.add_failed, { error: errMsg(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={t.add_device}>
      <p className="lead">{t.add_device_lead}</p>
      {scan && !scan.bluetooth && <p className="error">{t.no_bluetooth}</p>}
      {scan?.bluetooth && !scan.devices.length && <p className="muted">{t.no_new_devices}</p>}
      {scan?.devices.map((d) => (
        <label key={d.address} className="row line click">
          <input type="radio" name="new-device" checked={picked?.address === d.address} onChange={() => { setPicked(d); setName(d.name || d.model); }} />
          <span className="grow">{d.model}<div className="muted">{d.address} · RSSI {d.rssi}</div></span>
        </label>
      ))}
      {picked && (
        <div className="fields">
          <label className="f"><span>{t.name}</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="f"><span>{t.new_room}</span><input value={room} onChange={(e) => setRoom(e.target.value)} /></label>
          <label className="f"><span>{t.room_category}</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t.default_opt}</option>
              {scan!.room_categories.map((c) => <option key={c} value={c}>{t.categories[c] ?? c}</option>)}
            </select>
          </label>
        </div>
      )}
      {error ? <p className="error">{error}</p> : notice && <p className="notice">{notice}</p>}
      <div className="actions">
        <button className={`btn ${picked ? "ghost" : ""}`} disabled={busy} onClick={rescan}>{scan ? t.scan_again : t.scan}</button>
        {picked && <button className="btn" disabled={busy} onClick={add}>{busy ? t.adding : t.add_device_btn}</button>}
      </div>
    </Card>
  );
}

function Language({ lang, setLang }: { lang: string | null; setLang: (x: string | null) => void }) {
  const t = useT();
  return (
    <Card title={t.language}>
      <label className="f"><span>{t.language}</span>
        <select value={lang ?? ""} onChange={(e) => setLang(e.target.value || null)}>
          <option value="">{t.lang_auto}</option>
          {Object.entries(LANGS).map(([code, [, name]]) => <option key={code} value={code}>{name}</option>)}
        </select>
      </label>
    </Card>
  );
}

import type { T } from "./i18n"; // type-only: erased, so node can still run this file

// Pure helpers kept free of React/DOM imports so tests/test_panel_logic.mjs can run them under plain node.

export type Trigger = Record<string, any>;
export type PressRow = { trigger: string; type: string; entity_id: string; domain: string; service: string; data: string };
export type BindingForm = { target: string; device: string; up: string; down: string; stop: string; presses: PressRow[] };
export type ScheduleForm = { name: string; days: number[]; time: string; scene: string; fade: string };

// Mirrors bindings.py PRESS_ACTIONS.
export const PRESS_ACTIONS = ["toggle", "on", "off", "scene", "service"];

// A cover's current_position can be missing, out of range, or hostile (any entity can claim
// Plejd attribution); anything that isn't a 0-100 number is "unknown". Number("") is 0, hence the blank check.
export function clampPosition(value: unknown): number | null {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
}

export function stepTemperature(target: number, direction: 1 | -1, attrs: Record<string, any>): number {
  let next = Math.round((target + direction * (attrs.target_temp_step || 0.5)) * 100) / 100;
  if (attrs.min_temp != null) next = Math.max(attrs.min_temp, next);
  if (attrs.max_temp != null) next = Math.min(attrs.max_temp, next);
  return next;
}

// Fills "{x}" placeholders in a translated string.
export const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));

// A device trigger as a readable label. Triggers come from any integration, so only common types/subtypes
// are translated ("remote_button_*" shares the plain entries); anything else shows its own id.
export function triggerLabel(tr: Trigger, t: T): string {
  const raw = (v: string) => v.replace(/_/g, " ");
  const type = String(tr.type || "trigger").replace(/^remote_button_/, "");
  const sub = tr.subtype ? String(tr.subtype) : "";
  const button = /^button_?(\d+)$/.exec(sub);
  const subLabel = button ? fmt(t.trigger_button, { n: button[1] }) : (t.trigger_subtypes[sub] ?? raw(sub));
  // Zigbee2MQTT publishes every remote action as type "action" with the action as subtype: the subtype is the label.
  if (type === "action" && sub) return subLabel;
  const typeLabel = t.trigger_types[type] ?? raw(type);
  if (!sub) return typeLabel;
  return `${typeLabel} · ${subLabel}`;
}

// Card ids in their saved order; ids the saved order doesn't know yet keep their natural order at the end.
export function orderIds(ids: string[], saved: string[]): string[] {
  const rank = (id: string) => (saved.includes(id) ? saved.indexOf(id) : saved.length + ids.indexOf(id));
  return [...ids].sort((a, b) => rank(a) - rank(b));
}

// The order with `id` moved to position `to` (clamped to the list).
export function moveId(order: string[], id: string, to: number): string[] {
  const rest = order.filter((x) => x !== id);
  rest.splice(Math.max(0, Math.min(to, rest.length)), 0, id);
  return rest;
}

const pick = (triggers: Trigger[], index: string) => (index === "" ? null : triggers[Number(index)] || null);

// Form -> binding payload, mirroring the backend's validation so obvious mistakes are caught
// before a round-trip. Throws Error(message) for the user.
export function buildBinding(form: BindingForm, triggers: Trigger[], t: T): Record<string, any> {
  if (!form.device) throw new Error(t.err_pick_remote);
  const up = pick(triggers, form.up);
  const down = pick(triggers, form.down);
  const stop = pick(triggers, form.stop);
  if ((up || down) && !stop) throw new Error(t.err_pick_release);

  const presses: Record<string, any>[] = [];
  form.presses.forEach((row, i) => {
    const trigger = pick(triggers, row.trigger);
    const extra = row.type === "scene" ? row.entity_id : row.type === "service" ? row.domain || row.service || row.data.trim() : "";
    if (!trigger && !row.type && !extra) return; // an untouched row is skipped, a half-filled one is an error
    const n = { n: i + 1 };
    if (!trigger) throw new Error(fmt(t.err_press_trigger, n));
    if (!PRESS_ACTIONS.includes(row.type)) throw new Error(fmt(t.err_press_action, n));
    const action: Record<string, any> = { type: row.type };
    if (row.type === "scene") {
      if (!row.entity_id) throw new Error(fmt(t.err_press_scene, n));
      action.entity_id = row.entity_id;
    } else if (row.type === "service") {
      if (!row.domain.trim() || !row.service.trim()) throw new Error(fmt(t.err_press_service, n));
      action.domain = row.domain.trim();
      action.service = row.service.trim();
      if (row.data.trim()) {
        let data;
        try {
          data = JSON.parse(row.data);
        } catch {
          throw new Error(fmt(t.err_press_json, n));
        }
        // The backend merges it into the service call with **data, which needs a mapping.
        if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error(fmt(t.err_press_object, n));
        action.data = data;
      }
    }
    presses.push({ trigger, action });
  });
  if (!up && !down && !presses.length) throw new Error(t.err_need_dim_or_press);

  // Only dimming and toggle/on/off act on the target; scene and service actions don't need one.
  const needsTarget = Boolean(up || down) || presses.some((p) => !["scene", "service"].includes(p.action.type));
  const [kind, id] = [form.target.slice(0, form.target.indexOf(":")), form.target.slice(form.target.indexOf(":") + 1)];
  const targets = kind === "light" ? { entity_id: [id] } : kind === "area" ? { area_id: [id] } : null;
  if (needsTarget && !targets) throw new Error(t.err_pick_target);

  const binding: Record<string, any> = {};
  if (targets) binding.targets = targets;
  if (up) binding.up = up;
  if (down) binding.down = down;
  // A stray stop on a press-only binding would still fire stop_dim and could cancel another binding's ramp.
  if (up || down) binding.stop = stop;
  if (presses.length) binding.presses = presses;
  return binding;
}

export function buildSchedule(form: ScheduleForm, t: T) {
  const name = form.name.trim();
  if (!name) throw new Error(t.err_sched_name);
  if (!form.days.length) throw new Error(t.err_sched_days);
  if (!/^\d{2}:\d{2}$/.test(form.time)) throw new Error(t.err_sched_time);
  if (form.scene === "") throw new Error(t.err_sched_scene);
  const fade = Number(form.fade === "" ? 0 : form.fade);
  if (!Number.isInteger(fade) || fade < 0) throw new Error(t.err_sched_fade);
  return { name, days: [...form.days].sort((a, b) => a - b), time: form.time, scene: Number(form.scene), fade };
}

// ── the hero's site summary ────────────────────────────────────────────────

type SumState = { entity_id: string; state: string; attributes: Record<string, any> };
export type SumRoom = { name: string; entity_id: string | null; lights: string[] };
export type Connection = "gateway" | "ble" | "disconnected" | "unknown";
export type SiteSummary = {
  lightsOn: number; lights: number; roomsOn: number; rooms: number; litRooms: string[]; scenes: number; faults: number; connection: Connection;
};
const LINKS = ["gateway", "ble", "disconnected"];

// Counts for the hero, from the Plejd entities only. A room's group light is not a lamp of its own, so it
// is left out once the rooms are known; a room counts as lit when any of its lights is on.
export function siteSummary(states: SumState[], rooms: SumRoom[] | null): SiteSummary {
  const groups = new Set((rooms ?? []).map((r) => r.entity_id).filter(Boolean));
  const of = (domain: string) => states.filter((s) => s.entity_id.startsWith(`${domain}.`));
  const lamps = of("light").filter((s) => !groups.has(s.entity_id));
  const on = new Set(lamps.filter((s) => s.state === "on").map((s) => s.entity_id));
  const withLights = (rooms ?? []).filter((r) => r.lights.length);
  // The integration's connection sensor (sensor.py PlejdConnectivitySensor): an enum of the transports.
  const link = of("sensor").find((s) => Array.isArray(s.attributes.options) && LINKS.every((o) => s.attributes.options.includes(o)));
  const lit = withLights.filter((r) => r.lights.some((id) => on.has(id)));
  return {
    lightsOn: on.size,
    lights: lamps.length,
    roomsOn: lit.length,
    rooms: withLights.length,
    litRooms: lit.map((r) => r.name),
    scenes: of("scene").length,
    faults: of("binary_sensor").filter((s) => s.attributes.device_class === "problem" && s.state === "on").length,
    connection: link && LINKS.includes(link.state) ? (link.state as Connection) : "unknown",
  };
}

export type Theme = "auto" | "light" | "dark";
// "auto" follows Home Assistant's dark mode, or the system's when HA doesn't say.
export const isDark = (theme: Theme, haDark: boolean | undefined, sysDark: boolean) =>
  theme === "auto" ? haDark ?? sysDark : theme === "dark";

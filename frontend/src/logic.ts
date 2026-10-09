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

const pick = (triggers: Trigger[], index: string) => (index === "" ? null : triggers[Number(index)] || null);

// Form -> binding payload, mirroring the backend's validation so obvious mistakes are caught
// before a round-trip. Throws Error(message) for the user.
export function buildBinding(form: BindingForm, triggers: Trigger[]): Record<string, any> {
  if (!form.device) throw new Error("Pick a remote.");
  const up = pick(triggers, form.up);
  const down = pick(triggers, form.down);
  const stop = pick(triggers, form.stop);
  if ((up || down) && !stop) throw new Error("Pick a release (stop) trigger.");

  const presses: Record<string, any>[] = [];
  form.presses.forEach((row, i) => {
    const trigger = pick(triggers, row.trigger);
    const extra = row.type === "scene" ? row.entity_id : row.type === "service" ? row.domain || row.service || row.data.trim() : "";
    if (!trigger && !row.type && !extra) return; // an untouched row is skipped, a half-filled one is an error
    const n = `Press action ${i + 1}`;
    if (!trigger) throw new Error(`${n}: pick a trigger.`);
    if (!PRESS_ACTIONS.includes(row.type)) throw new Error(`${n}: pick an action.`);
    const action: Record<string, any> = { type: row.type };
    if (row.type === "scene") {
      if (!row.entity_id) throw new Error(`${n}: pick a scene.`);
      action.entity_id = row.entity_id;
    } else if (row.type === "service") {
      if (!row.domain.trim() || !row.service.trim()) throw new Error(`${n}: service actions need a domain and a service.`);
      action.domain = row.domain.trim();
      action.service = row.service.trim();
      if (row.data.trim()) {
        let data;
        try {
          data = JSON.parse(row.data);
        } catch {
          throw new Error(`${n}: data must be valid JSON.`);
        }
        // The backend merges it into the service call with **data, which needs a mapping.
        if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error(`${n}: data must be a JSON object.`);
        action.data = data;
      }
    }
    presses.push({ trigger, action });
  });
  if (!up && !down && !presses.length) throw new Error("Pick a dim up/down trigger or add at least one press action.");

  // Only dimming and toggle/on/off act on the target; scene and service actions don't need one.
  const needsTarget = Boolean(up || down) || presses.some((p) => !["scene", "service"].includes(p.action.type));
  const [kind, id] = [form.target.slice(0, form.target.indexOf(":")), form.target.slice(form.target.indexOf(":") + 1)];
  const targets = kind === "light" ? { entity_id: [id] } : kind === "area" ? { area_id: [id] } : null;
  if (needsTarget && !targets) throw new Error("Pick a light or room.");

  const binding: Record<string, any> = {};
  if (targets) binding.targets = targets;
  if (up) binding.up = up;
  if (down) binding.down = down;
  // A stray stop on a press-only binding would still fire stop_dim and could cancel another binding's ramp.
  if (up || down) binding.stop = stop;
  if (presses.length) binding.presses = presses;
  return binding;
}

export function buildSchedule(form: ScheduleForm) {
  const name = form.name.trim();
  if (!name) throw new Error("Name is required.");
  if (!form.days.length) throw new Error("Pick at least one day.");
  if (!/^\d{2}:\d{2}$/.test(form.time)) throw new Error("Pick a valid time.");
  if (form.scene === "") throw new Error("Pick a scene.");
  const fade = Number(form.fade === "" ? 0 : form.fade);
  if (!Number.isInteger(fade) || fade < 0) throw new Error("Fade must be zero or a whole number of seconds.");
  return { name, days: [...form.days].sort((a, b) => a - b), time: form.time, scene: Number(form.scene), fade };
}

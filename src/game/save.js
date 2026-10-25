export const SAVE_VERSION = 1;
export const SLOT_COUNT = 3;
const KEY = (slot) => `superpip.save.${slot}`;

export function safeStorage() {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    s.getItem('superpip.probe');
    return s;
  } catch { return null; }
}

function validShape(d) {
  return d && typeof d === 'object' && typeof d.world === 'number' && d.map && d.shared && Array.isArray(d.forms);
}

export function readSave(storage, slot) {
  if (!storage) return { ok: false, reason: 'unavailable' };
  let raw;
  try { raw = storage.getItem(KEY(slot)); } catch { return { ok: false, reason: 'unavailable' }; }
  if (raw == null) return { ok: false, reason: 'empty' };
  let data;
  try { data = JSON.parse(raw); } catch { return { ok: false, reason: 'corrupt', raw }; }
  if (!validShape(data)) return { ok: false, reason: 'corrupt', raw };
  if (data.v !== SAVE_VERSION) return { ok: false, reason: 'version', raw };
  return { ok: true, data };
}

export function writeSave(storage, slot, data) {
  if (!storage) return false;
  try { storage.setItem(KEY(slot), JSON.stringify(data)); return true; } catch { return false; }
}

export function eraseSave(storage, slot) {
  if (!storage) return false;
  try { storage.removeItem(KEY(slot)); return true; } catch { return false; }
}

export function listSaves(storage) {
  return Array.from({ length: SLOT_COUNT }, (_, slot) => {
    const r = readSave(storage, slot);
    if (!r.ok) return { slot, ok: false, reason: r.reason };
    const d = r.data;
    return { slot, ok: true, summary: { world: d.world, lives: d.shared.lives, cleared: Object.keys(d.map.cleared || {}).length } };
  });
}

export function exportSave(data) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

export function importSave(str) {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    return validShape(data) && data.v === SAVE_VERSION ? { ok: true, data } : { ok: false };
  } catch { return { ok: false }; }
}

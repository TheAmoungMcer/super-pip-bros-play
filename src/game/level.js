import { T, LEGEND, ENTITY_CHARS, ENTITY_TILE } from './tiles.js';

export function parseLevel(def) {
  const rows = def.map.split('\n');
  if (rows[0].trim() === '') rows.shift();
  if (rows.length && rows[rows.length - 1].trim() === '') rows.pop();
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const tiles = new Uint8Array(w * h);
  const spawns = [];
  rows.forEach((row, ty) => {
    for (let tx = 0; tx < w; tx++) {
      const c = row[tx] ?? '.';
      if (c in LEGEND) tiles[ty * w + tx] = LEGEND[c];
      else if (c in ENTITY_CHARS) {
        spawns.push({ i: spawns.length, type: ENTITY_CHARS[c], tx, ty });
        tiles[ty * w + tx] = ENTITY_TILE[c] ?? T.EMPTY;
      }
      else throw new Error(`level ${def.id}: unknown char '${c}' at ${tx},${ty}`);
    }
  });
  const [stx, sty] = def.start || [1, h - 2];
  return {
    id: def.id, theme: def.theme || 'overworld', music: def.music || def.theme || 'overworld',
    time: def.time ?? 300, w, h, tiles, spawns, start: { tx: stx, ty: sty },
    pipes: def.pipes || [], doors: def.doors || [], tileLog: [],
  };
}

export function tileAt(lv, tx, ty) {
  if (tx < 0 || tx >= lv.w) return T.HARD;
  if (ty < 0 || ty >= lv.h) return T.EMPTY;
  return lv.tiles[ty * lv.w + tx];
}

export function setTile(lv, tx, ty, id) {
  if (tx < 0 || tx >= lv.w || ty < 0 || ty >= lv.h) return;
  lv.tiles[ty * lv.w + tx] = id;
  lv.tileLog.push({ tx, ty, id });
}

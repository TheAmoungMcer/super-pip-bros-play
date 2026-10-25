import { TS, SUB } from './consts.js';
import { parseLevel } from './level.js';
import { T } from './tiles.js';
import { createCamera } from './camera.js';
import { placeAt } from './player.js';

export function buildCannons(lv) {
  const out = [];
  for (let ty = 0; ty < lv.h; ty++) for (let tx = 0; tx < lv.w; tx++) {
    if (lv.tiles[ty * lv.w + tx] === T.CANNON && (ty === 0 || lv.tiles[(ty - 1) * lv.w + tx] !== T.CANNON)) out.push({ tx, ty });
  }
  return out;
}

export function enterArea(s, to) {
  if (to.level && to.level !== s.lv.id) {
    s.areaStore[s.lv.id] = { tiles: s.lv.tiles.slice(), spawned: s.spawned.slice(), multicoin: { ...s.multicoin } };
    const def = s.defs && s.defs[to.level];
    if (!def) throw new Error(`area ${to.level} not found`);
    const lv = parseLevel(def);
    const saved = s.areaStore[to.level];
    if (saved) { lv.tiles.set(saved.tiles); }
    s.lv = lv;
    s.spawned = saved ? saved.spawned.slice() : new Uint8Array(lv.spawns.length);
    for (let i = 0; i < s.spawned.length; i++) if (s.spawned[i] !== 2) s.spawned[i] = 0;
    s.multicoin = saved ? { ...saved.multicoin } : {};
    s.entities = [];
    s.cannons = buildCannons(lv);
    s.events.push({ e: 'area', id: lv.id, music: lv.music });
  }
  const [tx, ty] = to.at;
  for (const p of s.players) {
    if (p.dead) continue;
    p.carry = -1; p.ride = -1; p.flyTimer = 0;
    if (to.dir === 'up') {           // come up out of a pipe whose mouth is at (tx..tx+1, ty)
      p.x = tx * TS + TS - (p.w * SUB >> 1);
      p.y = ty * TS + TS - p.h * SUB; // feet 16 px inside the pipe; rising 16 px lands them on the mouth
      p.pipe = { phase: 'exit', dir: 'up', t: 0 };
    } else if (to.dir === 'down') {
      p.x = tx * TS + TS - (p.w * SUB >> 1);
      p.y = (ty + 1) * TS - p.h * SUB - 2 * SUB;
      p.pipe = { phase: 'exit', dir: 'down', t: 0 };
    } else if (to.dir === 'left' || to.dir === 'right') {
      placeAt(p, tx, ty + 1);
      p.pipe = { phase: 'exit', dir: to.dir, t: 0 };
    } else {
      placeAt(p, tx, ty);             // doors
      p.pipe = null;
    }
  }
  s.players.forEach((p, i) => { s.cams[i] = createCamera(p, s.lv); });
}

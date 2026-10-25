import { TS, SUB, BTN } from './consts.js';
import { parseLevel, tileAt, setTile } from './level.js';
import { INFO, T } from './tiles.js';
import { createPlayer, updatePlayer, isBig, setForm, placeAt } from './player.js';
import { enterArea, buildCannons } from './areas.js';
import { createCamera, updateCamera } from './camera.js';
import { moveBody } from './physics.js';
import { killPlayer, formActions } from './powerups.js';
import { TYPES, spawnEntity, updateEntities } from './entities/index.js';
import { playerContacts } from './entities/common.js';
import './entities/all.js';
import { fireCannons } from './entities/hazards.js';

export const DEATH_FRAMES = 150, RESPAWN_FRAMES = 180, CLEAR_FRAMES = 240, TIME_TICK = 40;
const SPAWN_MARGIN = 24, DESPAWN_MARGIN = 80;  // pixels beyond the screen edge

export function createLevelSim(def, { players = 1, forms = [], seed = 1, shared = { coins: 0, lives: 5, score: 0 }, defs = null } = {}) {
  const lv = parseLevel(def);
  const s = {
    frame: 0, lv, players: [], cams: [], entities: [], nextId: 1, rng: { seed },
    spawned: new Uint8Array(lv.spawns.length), time: lv.time, timeSub: 0,
    bumps: [], multicoin: {}, pswitch: 0, mode: 'play', modeTimer: 0, clear: null,
    shared: { ...shared }, events: [],
  };
  s.defs = defs || {};
  s.areaStore = {};
  s.cannons = buildCannons(lv);
  for (let i = 0; i < players; i++) {
    const p = createPlayer(i, lv.start.tx + i, lv.start.ty, forms[i] || 'small');
    moveBody(p, lv);   // settle onto the ground so a press on frame 1 can jump
    s.players.push(p);
    s.cams.push(createCamera(p, lv));
  }
  return s;
}

// Score events are the single source of points: stepLevel adds them and shows a popup.
export function addScore(s, pts, x, y) {
  s.events.push({ e: 'score', pts, x, y });
}

export function addCoins(s, n = 1) {
  s.shared.coins += n;
  s.shared.score += 50 * n;
  s.events.push({ e: 'sfx', id: 'coin' });
  while (s.shared.coins >= 100) { s.shared.coins -= 100; s.shared.lives++; s.events.push({ e: 'sfx', id: '1up' }); }
}

export function stepLevel(s, inputs) {
  s.events = [];
  s.frame++;
  s.bumps = s.bumps.filter(b => --b.t > 0);
  for (const p of s.players) {
    if (p.dead) { stepDead(s, p); continue; }
    if (p.pipe) { stepPipe(s, p); continue; }
    const buttons = s.mode === 'play' ? (inputs[p.idx] | 0) : BTN.RIGHT;
    const pressed = buttons & ~p.prev;
    const out = { events: s.events, bumps: [] };
    updatePlayer(p, buttons, s.lv, out);
    for (const b of out.bumps) hitBlock(s, b);
    formActions(s, p, pressed);
    afterMove(s, p, buttons);
  }
  s.players.forEach((p, i) => updateCamera(s.cams[i], p, s.lv));
  spawnInView(s);
  fireCannons(s);
  updateEntities(s);
  ridePlatforms(s);
  despawnOutOfView(s);
  playerContacts(s);
  for (const ev of s.events) {
    if (ev.e !== 'score') continue;
    s.shared.score += ev.pts;
    spawnEntity(s, 'popup', ev.x, ev.y, { pts: ev.pts, label: ev.label || String(ev.pts) });
  }
  tickTimer(s);
  resolveMode(s);
}

export function clearLevel(s, by, card) {
  if (s.mode !== 'play') return;
  s.mode = 'clear'; s.modeTimer = 0;
  s.clear = { by, card };
  s.events.push({ e: 'clear', card, boss: card < 0 });
}

export function hitBlock(s, { tx, ty, by, big }) {
  const lv = s.lv, id = tileAt(lv, tx, ty), info = INFO[id];
  const px = tx * TS, py = ty * TS;
  const emerge = (type) => spawnEntity(s, type, px + SUB, py, { state: 'emerge', by });
  if (info.bump || info.breakable || id === T.NOTE) s.bumps.push({ tx, ty, t: 8 });
  switch (info.bump) {
    case 'coin': setTile(lv, tx, ty, T.USED); addCoins(s); spawnEntity(s, 'coinpop', px + 4 * SUB, py - TS); break;
    case 'multicoin': {
      const k = `${tx},${ty}`;
      s.multicoin[k] = (s.multicoin[k] ?? 10) - 1;
      addCoins(s); spawnEntity(s, 'coinpop', px + 4 * SUB, py - TS);
      if (s.multicoin[k] <= 0) setTile(lv, tx, ty, T.USED);
      break;
    }
    case 'power': setTile(lv, tx, ty, T.USED); emerge(big ? 'blossom' : 'berry'); break;
    case 'leaf': setTile(lv, tx, ty, T.USED); emerge(big ? 'leaf' : 'berry'); break;
    case '1up': setTile(lv, tx, ty, T.USED); emerge('oneup'); break;
    case 'star': setTile(lv, tx, ty, T.USED); emerge('star'); break;
    case 'pswitch': setTile(lv, tx, ty, T.USED); spawnEntity(s, 'pswitch', px, py - TS); break;
    default:
      if (info.breakable && big) {
        setTile(lv, tx, ty, T.EMPTY);
        s.shared.score += 10;
        for (const [dx, dy] of [[-12, -64], [12, -64], [-12, -40], [12, -40]]) {
          spawnEntity(s, 'brickbit', px + 4 * SUB, py + 4 * SUB, { vx: dx, vy: dy });
        }
        s.events.push({ e: 'sfx', id: 'break' });
      }
  }
  // Anything standing on the bumped block gets knocked.
  for (const e of s.entities) {
    if (e.dead || e.state === 'flipped' || !TYPES[e.type].hit) continue;
    const foot = e.y + e.h * SUB;
    if (foot >= py - 2 * SUB && foot <= py + 2 * SUB && e.x + e.w * SUB > px && e.x < px + TS) {
      TYPES[e.type].hit(e, s, 'bump', null);
    }
  }
}

function overlappedTiles(lv, p, fn) {
  const tx0 = Math.floor(p.x / TS), tx1 = Math.floor((p.x + p.w * SUB - 1) / TS);
  const ty0 = Math.floor(p.y / TS), ty1 = Math.floor((p.y + p.h * SUB - 1) / TS);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) fn(tx, ty, tileAt(lv, tx, ty));
}

function afterMove(s, p, buttons) {
  const lv = s.lv;
  // Music blocks bounce you; holding A bounces higher.
  if (p.onGround) {
    const tx = Math.floor((p.x + (p.w * SUB >> 1)) / TS), ty = Math.floor((p.y + p.h * SUB) / TS);
    if (tileAt(lv, tx, ty) === T.NOTE) {
      p.vy = buttons & BTN.A ? -88 : -48; p.onGround = false;
      s.bumps.push({ tx, ty, t: 8 });
      s.events.push({ e: 'sfx', id: 'note' });
    }
  }
  overlappedTiles(lv, p, (tx, ty, id) => {
    const info = INFO[id];
    if (info.coin) { setTile(lv, tx, ty, T.EMPTY); addCoins(s); }
    else if (info.deadly) killPlayer(s, p);
    else if (id === T.GOAL && s.mode === 'play') clearLevel(s, p.idx, Math.floor(s.frame / 8) % 3);
  });
  if (p.y > lv.h * TS + 32 * SUB) killPlayer(s, p);
  checkPipesAndDoors(s, p, buttons);
}

function stepDead(s, p) {
  p.deathTimer++;
  if (p.deathTimer > 30) { p.vy = Math.min(p.vy + 3, 64); p.y += p.vy; }
  const partner = s.players.find(o => o !== p && !o.dead);
  if (partner && s.mode === 'play' && ++p.respawnTimer >= RESPAWN_FRAMES) {
    p.dead = false; p.deathTimer = 0; p.respawnTimer = 0;
    setForm(p, 'small');
    p.x = partner.x;
    p.y = partner.y + partner.h * SUB - p.h * SUB;
    p.vx = 0; p.vy = 0; p.onGround = partner.onGround;
    p.hurtTimer = 120;
    s.events.push({ e: 'sfx', id: 'respawn', who: p.idx });
  }
}

function inRange(s, px, margin) {
  return s.cams.some(c => px >= c.x - margin && px <= c.x + 256 + margin);
}

function spawnInView(s) {
  s.lv.spawns.forEach((sp, i) => {
    const px = sp.tx * 16 + 8;
    if (s.spawned[i] === 3 && !inRange(s, px, SPAWN_MARGIN)) s.spawned[i] = 0;
    if (s.spawned[i] !== 0 || !inRange(s, px, SPAWN_MARGIN)) return;
    s.spawned[i] = 1;
    const e = spawnEntity(s, sp.type, sp.tx * TS + SUB, sp.ty * TS + 2 * SUB, { spawn: i });
    // Entities stand on the bottom of their spawn tile.
    e.y = (sp.ty + 1) * TS - e.h * SUB;
  });
}

function despawnOutOfView(s) {
  for (const e of s.entities) {
    if (e.dead || e.persistent) continue;
    const px = Math.floor(e.x / SUB) + e.w / 2;
    if (inRange(s, px, DESPAWN_MARGIN)) continue;
    e.dead = true;
    if (e.spawn >= 0 && s.spawned[e.spawn] === 1) {
      const sp = s.lv.spawns[e.spawn];
      s.spawned[e.spawn] = inRange(s, sp.tx * 16 + 8, SPAWN_MARGIN) ? 3 : 0;
    }
  }
  s.entities = s.entities.filter(e => !e.dead);
}

function tickTimer(s) {
  if (s.mode !== 'play') return;
  if (s.pswitch > 0 && --s.pswitch === 0) { swapPSwitch(s, false); s.events.push({ e: 'pswitch-end' }); }
  if (++s.timeSub < TIME_TICK) return;
  s.timeSub = 0;
  s.time--;
  if (s.time === 100) s.events.push({ e: 'sfx', id: 'hurry' });
  if (s.time <= 0) { s.time = 0; for (const p of s.players) killPlayer(s, p); }
}

function resolveMode(s) {
  if (s.mode === 'play') {
    if (s.players.every(p => p.dead) && s.players.every(p => p.deathTimer >= DEATH_FRAMES)) s.mode = 'fail';
  } else if (s.mode === 'clear') {
    if (++s.modeTimer >= CLEAR_FRAMES) s.mode = 'done';
  }
}

export function levelResult(s) {
  return {
    cleared: s.mode === 'done' || s.mode === 'clear',
    card: s.clear ? s.clear.card : -1,
    forms: s.players.map(p => (p.dead ? 'small' : p.form)),
  };
}

export function swapPSwitch(s, on) {
  const lv = s.lv;
  const [a, b, c, d] = on ? [T.BRICK, T.PSWITCH_COIN, T.COIN, T.PSWITCH_BRICK] : [T.PSWITCH_COIN, T.BRICK, T.PSWITCH_BRICK, T.COIN];
  for (let ty = 0; ty < lv.h; ty++) for (let tx = 0; tx < lv.w; tx++) {
    const id = lv.tiles[ty * lv.w + tx];
    if (id === a) setTile(lv, tx, ty, b);
    else if (id === c) setTile(lv, tx, ty, d);
  }
}


const PIPE_FRAMES = 32;

function stepPipe(s, p) {
  const d = p.pipe.dir, step = 8;
  if (d === 'down') p.y += step; else if (d === 'up') p.y -= step;
  else if (d === 'right') p.x += step; else p.x -= step;
  if (++p.pipe.t < PIPE_FRAMES) return;
  if (p.pipe.phase === 'enter') { const to = p.pipe.to; p.pipe = null; enterArea(s, to); }
  else { p.pipe = null; p.vy = 0; }
}

function checkPipesAndDoors(s, p, buttons) {
  if (p.dead || p.pipe) return;
  const cx = p.x + (p.w * SUB >> 1), foot = p.y + p.h * SUB;
  for (const pp of s.lv.pipes) {
    const [tx, ty] = pp.at;
    let go = false;
    if (pp.dir === 'down') go = (buttons & BTN.DOWN) && p.onGround && foot === ty * TS && cx >= tx * TS + 4 * SUB && cx <= (tx + 2) * TS - 4 * SUB;
    else if (pp.dir === 'up') go = (buttons & BTN.UP) && p.y === (ty + 1) * TS && cx >= tx * TS + 4 * SUB && cx <= (tx + 2) * TS - 4 * SUB;
    else if (pp.dir === 'right') go = (buttons & BTN.RIGHT) && p.onGround && foot === (ty + 2) * TS && p.x + p.w * SUB === tx * TS;
    else if (pp.dir === 'left') go = (buttons & BTN.LEFT) && p.onGround && foot === (ty + 2) * TS && p.x === (tx + 1) * TS;
    if (go) {
      p.pipe = { phase: 'enter', dir: pp.dir, t: 0, to: pp.to };
      p.vx = 0; p.vy = 0; p.carry = -1;
      s.events.push({ e: 'sfx', id: 'pipe' });
      return;
    }
  }
  if (!(buttons & BTN.UP) || !p.onGround) return;
  for (const d of s.lv.doors) {
    const [tx, ty] = d.at;
    if (cx >= tx * TS && cx < (tx + 1) * TS && foot === (ty + 1) * TS) {
      if (d.to.level && d.to.level !== s.lv.id) enterArea(s, d.to);
      else {
        placeAt(p, d.to.at[0], d.to.at[1]);
        s.cams[p.idx] = createCamera(p, s.lv);
      }
      s.events.push({ e: 'sfx', id: 'door' });
      return;
    }
  }
}

// Move a rider onto a platform's top through the tile collider; false if tiles got in the way.
function carryTo(p, e, lv, riding) {
  const target = e.y - p.h * SUB, vx = p.vx;
  p.vx = riding ? e.x - (e.prevX ?? e.x) : 0;
  p.vy = target - p.y;
  p.onGround = false;
  moveBody(p, lv);
  p.vx = vx;
  return p.y === target;
}

function ridePlatforms(s) {
  for (const p of s.players) {
    if (p.dead || p.pipe) continue;
    const prevRide = p.ride;
    p.ride = -1;
    for (const e of s.entities) {
      if (!e.solidTop || e.dead) continue;
      const overX = p.x + p.w * SUB > e.x && p.x < e.x + e.w * SUB;
      if (!overX) continue;
      const foot = p.y + p.h * SUB;
      const riding = prevRide === e.id && p.vy >= 0;
      const landing = !riding && p.vy >= 0 && foot >= (e.prevY ?? e.y) - 2 * SUB && foot - p.vy <= (e.prevY ?? e.y) + 2 * SUB;
      if (!(riding || landing) || !carryTo(p, e, s.lv, riding)) continue;
      p.vy = 0; p.onGround = true; p.ride = e.id;
      break;
    }
  }
}

// Clone for search/prediction. Level defs are static, so they are shared, not copied.
export function cloneSim(s) {
  const defs = s.defs;
  s.defs = null;
  const c = structuredClone(s);
  s.defs = defs; c.defs = defs;
  return c;
}

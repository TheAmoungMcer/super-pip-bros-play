import { BTN } from './consts.js';
import { createLevelSim, stepLevel, levelResult } from './sim.js';
import { createMap, stepMap, markCleared, markUsed } from './worldmap.js';
import { addItem, useItem, addCard } from './inventory.js';
import { createHut, stepHut, createSlots, stepSlots } from './minigames.js';
import { randInt } from './rng.js';
import { STAR_FRAMES } from './powerups.js';
import { SAVE_VERSION } from './save.js';
import { LEVELS as W1 } from '../content/levels/w1.js';
import { MAP_W1 } from '../content/maps/w1.js';
import { createPlayer } from './player.js';
import { createCamera } from './camera.js';
import { SUB } from './consts.js';

export const WORLDS = { 1: { levels: W1, map: MAP_W1 } };
export const START_LIVES = 4;
export const LETTER_FRAMES = 240;

const pad = (arr, n, make) => Array.from({ length: n }, (_, i) => (arr && arr[i] !== undefined ? structuredClone(arr[i]) : make()));

export function createSession({ players = 1, seed = 1, save = null } = {}) {
  const sess = {
    scene: 'map', t: 0, players, world: 1, rng: { seed },
    shared: { lives: START_LIVES, coins: 0, score: 0 },
    forms: pad(null, players, () => 'small'), stars: pad(null, players, () => false),
    items: pad(null, players, () => []), cards: pad(null, players, () => []),
    map: createMap(WORLDS[1].map), menus: pad(null, players, () => null),
    level: null, node: null, hut: null, slots: null, gameover: null,
    paused: false, quit: false, dirty: false, events: [], prev: [0, 0],
  };
  if (save && isUsableSave(save)) applySave(sess, save);
  return sess;
}

export function makeSave(sess) {
  const m = sess.map;
  return {
    v: SAVE_VERSION, world: sess.world,
    map: { x: m.x, y: m.y, cleared: { ...m.cleared }, opened: { ...m.opened }, used: { ...m.used } },
    shared: { ...sess.shared, lives: sess.shared.lives < 0 ? START_LIVES : sess.shared.lives }, forms: [...sess.forms], items: structuredClone(sess.items), cards: structuredClone(sess.cards),
  };
}

// A save that passed save.js's shape check can still point somewhere this build can't load.
export function isUsableSave(d) {
  const m = d && d.map;
  return !!(WORLDS[d.world] && m && Number.isInteger(m.x) && Number.isInteger(m.y) && d.shared && Array.isArray(d.forms));
}

export function applySave(sess, d) {
  sess.world = d.world;
  sess.map = createMap(WORLDS[d.world].map);
  Object.assign(sess.map, { x: d.map.x, y: d.map.y, px: d.map.x * 16, py: d.map.y * 16, cleared: { ...d.map.cleared }, opened: { ...d.map.opened }, used: { ...d.map.used } });
  sess.shared = { ...d.shared };
  // Keep every saved player's data, even when this session starts with fewer players.
  const n = (arr) => Math.max(sess.players, (arr || []).length);
  sess.forms = pad(d.forms, n(d.forms), () => 'small');
  sess.items = pad(d.items, n(d.items), () => []);
  sess.cards = pad(d.cards, n(d.cards), () => []);
}

const toScene = (sess, scene) => { sess.scene = scene; sess.t = 0; };

export function stepSession(sess, inputs) {
  sess.events = [];
  sess.t++;
  const last = sess.prev;
  const pressed = inputs.map((b, i) => b & ~(last[i] | 0));
  sess.prev = [...inputs];
  const w = WORLDS[sess.world];
  switch (sess.scene) {
    case 'map': return stepMapScene(sess, w, inputs, pressed, last);
    case 'level': return stepLevelScene(sess, w, inputs, pressed);
    case 'hut': {
      const r = stepHut(sess.hut, inputs.slice(0, sess.players));
      if (r) { addItem(sess.items[r.to], r.give); sess.events.push({ e: 'sfx', id: 'powerup' }); }
      if (sess.hut.done) { markUsed(sess.map, sess.node.key); sess.hut = null; sess.dirty = true; toScene(sess, 'map'); }
      return;
    }
    case 'slots': {
      const r = stepSlots(sess.slots, inputs.slice(0, sess.players));
      if (r) { sess.shared.lives += r.lives; sess.events.push({ e: 'sfx', id: r.lives ? '1up' : 'bump' }); }
      if (sess.slots.done) { markUsed(sess.map, sess.node.key); sess.slots = null; sess.dirty = true; toScene(sess, 'map'); }
      return;
    }
    case 'letter':
      if (sess.t > LETTER_FRAMES && pressed.some(p => p & (BTN.A | BTN.START))) toScene(sess, 'map');
      return;
    case 'gameover': {
      const any = pressed.reduce((a, b) => a | b, 0);
      if (any & (BTN.UP | BTN.DOWN)) { sess.gameover.sel ^= 1; sess.events.push({ e: 'sfx', id: 'select' }); }
      if (any & (BTN.A | BTN.START)) {
        if (sess.gameover.sel === 0) { sess.shared.lives = START_LIVES; sess.dirty = true; toScene(sess, 'map'); }
        else sess.quit = true;
      }
    }
  }
}

function stepMapScene(sess, w, inputs, pressed, last) {
  // Arriving on the map: what was held last frame is not a new press.
  if (sess.t === 1) sess.map.prev = [...last];
  const steer = inputs.map((b, i) => {
    if (i >= sess.players) return 0;
    const menu = sess.menus[i];
    if (pressed[i] & BTN.START) { sess.menus[i] = menu ? null : { sel: 0 }; sess.events.push({ e: 'sfx', id: 'pause' }); return 0; }
    if (!menu) return b;
    const inv = sess.items[i];
    if (pressed[i] & BTN.LEFT) menu.sel = Math.max(0, menu.sel - 1);
    if (pressed[i] & BTN.RIGHT) menu.sel = Math.min(Math.max(0, inv.length - 1), menu.sel + 1);
    if (pressed[i] & BTN.A && inv.length) {
      const fx = useItem(inv, menu.sel, { form: sess.forms[i] });
      if (fx) {
        if (fx.form) sess.forms[i] = fx.form;
        if (fx.star) sess.stars[i] = true;
        sess.events.push({ e: 'sfx', id: 'powerup' });
        sess.menus[i] = null; sess.dirty = true;
        return 0;
      }
      sess.events.push({ e: 'sfx', id: 'bump' });
    }
    if (pressed[i] & BTN.B) sess.menus[i] = null;
    return 0;
  });
  const wasMoving = !!sess.map.moving;
  const act = stepMap(sess.map, w.map, steer);
  if (!wasMoving && sess.map.moving) sess.events.push({ e: 'sfx', id: 'map' });
  if (act) enterNode(sess, act);
}

export function enterNode(sess, act) {
  const w = WORLDS[sess.world];
  sess.node = act;
  sess.menus = sess.menus.map(() => null);
  if (act.kind === 'hut') { sess.hut = createHut(sess.rng); toScene(sess, 'hut'); return; }
  if (act.kind === 'slots') { sess.slots = createSlots(1 + randInt(sess.rng, 97)); toScene(sess, 'slots'); return; }
  sess.level = createLevelSim(w.levels[act.level], {
    players: sess.players, forms: sess.forms, seed: 1 + randInt(sess.rng, 1e9), shared: sess.shared, defs: w.levels,
  });
  sess.level.players.forEach((p, i) => { if (sess.stars[i]) { p.starTimer = STAR_FRAMES; sess.stars[i] = false; } });
  sess.paused = false;
  toScene(sess, 'level');
}

function stepLevelScene(sess, w, inputs, pressed) {
  const lv = sess.level;
  if (sess.players === 1 && (pressed[0] & BTN.START) && lv.mode === 'play') {
    sess.paused = !sess.paused;
    sess.events.push({ e: 'sfx', id: 'pause' });
  }
  if (sess.paused) return;
  stepLevel(lv, inputs.slice(0, sess.players));
  sess.events.push(...lv.events);
  sess.shared = lv.shared;
  if (lv.mode === 'done') finishLevel(sess, w);
  else if (lv.mode === 'fail') failLevel(sess);
}

function finishLevel(sess, w) {
  const lv = sess.level, r = levelResult(lv);
  sess.shared = { ...lv.shared, score: lv.shared.score + lv.time * 50 };
  r.forms.forEach((f, i) => { sess.forms[i] = f; });
  if (r.card >= 0) {
    const by = lv.clear.by;
    const c = addCard(sess.cards[by], r.card);
    sess.cards[by] = c.cards;
    if (c.lives) { sess.shared.lives += c.lives; sess.events.push({ e: 'sfx', id: '1up' }); }
  }
  markCleared(sess.map, w.map, sess.node.key);
  sess.level = null;
  sess.dirty = true;
  if (sess.node.kind === 'airship') {
    sess.items.forEach(inv => addItem(inv, 'star'));
    toScene(sess, 'letter');
  } else toScene(sess, 'map');
}

function failLevel(sess) {
  sess.shared = { ...sess.level.shared, lives: sess.level.shared.lives - 1 };
  sess.forms = sess.forms.map(() => 'small');
  sess.level = null;
  sess.dirty = true;
  if (sess.shared.lives < 0) { sess.gameover = { sel: 0 }; toScene(sess, 'gameover'); }
  else toScene(sess, 'map');
}

export function addPlayer(sess) {
  if (sess.players >= 2) return;
  sess.players = 2;
  sess.paused = false;      // solo pause can't be undone in co-op, so a join always resumes
  if (sess.forms.length < 2) sess.forms.push('small');
  if (sess.stars.length < 2) sess.stars.push(false);
  if (sess.items.length < 2) sess.items.push([]);
  if (sess.cards.length < 2) sess.cards.push([]);
  if (sess.menus.length < 2) sess.menus.push(null);
  if (sess.level) {
    const host = sess.level.players[0];
    const p = createPlayer(1, 0, 0, 'small');
    p.x = host.x; p.y = host.y + host.h * SUB - p.h * SUB; p.onGround = host.onGround; p.hurtTimer = 120;
    sess.level.players.push(p);
    sess.level.cams.push(createCamera(p, sess.level.lv));
  }
}

export function dropPlayer(sess) {
  if (sess.players < 2) return;
  sess.players = 1;
  sess.menus[1] = null;
  if (sess.level) { sess.level.players.length = 1; sess.level.cams.length = 1; }
}
// Window lost focus: pause a solo level (co-op keeps running for the other player).
export function autoPause(sess) {
  if (sess.players === 1 && sess.scene === 'level' && sess.level.mode === 'play') sess.paused = true;
}

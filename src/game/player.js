import { BTN, TS, SUB } from './consts.js';
import { moveBody } from './physics.js';
import { slopeDownDir } from './tiles.js';

export const PHYS = {
  WALK_MAX: 24, RUN_MAX: 40, P_MAX: 48,
  ACCEL: 1, SKID: 3, AIR_TURN: 2, FRICTION: 1,
  GRAV: 5, GRAV_HOLD: 1, HOLD_UNTIL: -32, FALL_MAX: 64,
  JUMP_STAND: 56, JUMP_RUN: 60, JUMP_P: 64,
  P_STEP: 8, P_DRAIN: 24, SLIDE_ACCEL: 2, FLY_FRAMES: 255,
};

const SMALL_H = 15, BIG_H = 26, WIDTH = 12;

export const isBig = (form) => form !== 'small';

export function createPlayer(idx, tx, ty, form = 'small') {
  const p = {
    idx, form, x: 0, y: 0, w: WIDTH, h: SMALL_H, vx: 0, vy: 0, dir: 1, onGround: false,
    crouch: false, sliding: false, pmeter: 0, pTimer: 0, pRunning: false,
    flyTimer: 0, floatTimer: 0, tailTimer: 0, fireCooldown: 0, hurtTimer: 0, starTimer: 0,
    growTimer: 0, kickTimer: 0, carry: -1, dead: false, deathTimer: 0, respawnTimer: 0,
    finished: false, anim: 'stand', animT: 0, prev: 0, lastSlope: 0, skid: false, combo: 0, ride: -1, pipe: null,
  };
  setForm(p, form);
  placeAt(p, tx, ty);
  return p;
}

export function placeAt(p, tx, ty) {
  p.x = tx * TS + ((TS - p.w * SUB) >> 1);
  p.y = (ty + 1) * TS - p.h * SUB;
  p.vx = 0; p.vy = 0; p.onGround = false;
}

function setHeight(p, h) {
  const foot = p.y + p.h * SUB;
  p.h = h;
  p.y = foot - h * SUB;
}

export function setForm(p, form) {
  p.form = form;
  setHeight(p, isBig(form) && !p.crouch ? BIG_H : SMALL_H);
}

export function updatePlayer(p, buttons, lv, out) {
  const pressed = buttons & ~p.prev;
  p.prev = buttons;
  if (p.dead || p.finished) return;
  if (p.growTimer > 0) { p.growTimer--; return; }
  for (const k of ['hurtTimer', 'starTimer', 'fireCooldown', 'tailTimer', 'kickTimer']) if (p[k] > 0) p[k]--;

  const L = buttons & BTN.LEFT, R = buttons & BTN.RIGHT;
  const run = buttons & BTN.B, holdA = buttons & BTN.A, down = buttons & BTN.DOWN;
  const want = R && !L ? 1 : L && !R ? -1 : 0;

  // Crouch and slide (ground only)
  if (p.onGround) {
    if (down && p.lastSlope && p.carry < 0) p.sliding = true;
    if (p.sliding && (want !== 0 || (!p.lastSlope && p.vx === 0))) p.sliding = false;
    const crouch = !p.sliding && !!down && isBig(p.form);
    if (crouch !== p.crouch) { p.crouch = crouch; setHeight(p, crouch || !isBig(p.form) ? SMALL_H : BIG_H); }
  }

  // Horizontal
  const max = run ? (p.pmeter === 7 ? PHYS.P_MAX : PHYS.RUN_MAX) : PHYS.WALK_MAX;
  p.skid = false;
  if (p.sliding) {
    const d = slopeDownDir(p.lastSlope);
    if (d) p.vx = Math.max(-PHYS.P_MAX, Math.min(PHYS.P_MAX, p.vx + d * PHYS.SLIDE_ACCEL));
    else p.vx -= Math.sign(p.vx) * PHYS.FRICTION;
  } else if (want && !(p.crouch && p.onGround)) {
    if (p.vx * want < 0) {
      p.vx += want * (p.onGround ? PHYS.SKID : PHYS.AIR_TURN);
      if (p.vx * want > 0) p.vx = 0;
      p.skid = p.onGround;
    } else if (Math.abs(p.vx) < max) {
      p.vx = want > 0 ? Math.min(p.vx + PHYS.ACCEL, max) : Math.max(p.vx - PHYS.ACCEL, -max);
    } else if (Math.abs(p.vx) > max && p.onGround) {
      p.vx -= Math.sign(p.vx) * PHYS.FRICTION;
    }
    p.dir = want;
  } else if (p.onGround) {
    const f = Math.min(Math.abs(p.vx), PHYS.FRICTION);
    p.vx -= Math.sign(p.vx) * f;
  }

  // P-meter: fills while running flat-out on the ground, drains otherwise.
  if (p.onGround && p.flyTimer === 0) {
    const running = !!run && want !== 0 && Math.abs(p.vx) >= PHYS.RUN_MAX;
    if (running !== p.pRunning) { p.pRunning = running; p.pTimer = 0; }
    p.pTimer++;
    if (running && p.pTimer >= PHYS.P_STEP) { p.pTimer = 0; if (p.pmeter < 7) p.pmeter++; }
    else if (!running && p.pTimer >= PHYS.P_DRAIN) { p.pTimer = 0; if (p.pmeter > 0) p.pmeter--; }
  }

  // Jump (with the Glide Leaf, a full P-meter jump starts flight)
  if ((pressed & BTN.A) && p.onGround) {
    const s = Math.abs(p.vx);
    p.vy = -(s >= PHYS.P_MAX ? PHYS.JUMP_P : s >= PHYS.RUN_MAX ? PHYS.JUMP_RUN : PHYS.JUMP_STAND);
    p.onGround = false;
    p.sliding = false;
    if (p.form === 'leaf' && p.pmeter === 7) p.flyTimer = PHYS.FLY_FRAMES;
    out.events.push({ e: 'sfx', id: 'jump', who: p.idx });
  } else if ((pressed & BTN.A) && !p.onGround && p.form === 'leaf') {
    p.floatTimer = 16;            // flap: rises while flying, otherwise slows the fall
  }

  // Gravity
  if (p.floatTimer > 0) p.floatTimer--;
  if (p.flyTimer > 0 && --p.flyTimer === 0) p.pmeter = 0;
  if (p.flyTimer > 0 && p.floatTimer > 0) {
    p.vy = -24;
  } else {
    p.vy += p.vy < PHYS.HOLD_UNTIL && holdA ? PHYS.GRAV_HOLD : PHYS.GRAV;
    const cap = p.floatTimer > 0 ? 16 : PHYS.FALL_MAX;
    if (p.vy > cap) p.vy = cap;
  }

  const r = moveBody(p, lv);
  if (r.landed) p.flyTimer = 0;
  p.lastSlope = p.onGround ? r.slope : 0;
  if (r.ceiling) {
    out.bumps.push({ tx: r.ceiling.tx, ty: r.ceiling.ty, by: p.idx, big: isBig(p.form) });
    out.events.push({ e: 'sfx', id: 'bump' });
  }

  // Animation
  p.anim = !p.onGround ? (p.pmeter === 7 ? 'runjump' : 'jump')
    : p.crouch ? 'crouch' : p.sliding ? 'slide' : p.skid ? 'skid'
    : p.vx === 0 ? 'stand' : p.pmeter === 7 ? 'run' : 'walk';
  if (p.onGround) p.animT += Math.max(1, Math.abs(p.vx) >> 3);
}

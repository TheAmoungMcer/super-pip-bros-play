import { setForm } from './player.js';
import { BTN, SUB, TS } from './consts.js';
import { TYPES, spawnEntity } from './entities/index.js';
import { overlaps } from './physics.js';
import { tileAt } from './level.js';
import { INFO } from './tiles.js';
import { hitBlock } from './sim.js';

export function killPlayer(s, p) {
  if (p.dead) return;
  p.dead = true; p.deathTimer = 0; p.respawnTimer = 0;
  p.vx = 0; p.vy = -64; p.carry = -1; p.flyTimer = 0; p.starTimer = 0; p.pmeter = 0;
  p.crouch = false; p.sliding = false;
  setForm(p, 'small');
  s.events.push({ e: 'sfx', id: 'death', who: p.idx });
}

export function hurtPlayer(s, p) {
  if (p.dead || p.hurtTimer > 0 || p.starTimer > 0 || p.growTimer > 0) return;
  if (p.form === 'small') { killPlayer(s, p); return; }
  setForm(p, p.form === 'big' ? 'small' : 'big');
  p.hurtTimer = 120; p.growTimer = 30; p.flyTimer = 0;
  s.events.push({ e: 'sfx', id: 'shrink' });
}

export const STAR_FRAMES = 600;

export function givePower(s, p, item, at) {
  const pos = { x: at.x, y: at.y };
  if (item === 'oneup') {
    s.shared.lives++;
    s.events.push({ e: 'sfx', id: '1up' }, { e: 'score', pts: 0, label: '1UP', ...pos });
    return;
  }
  s.events.push({ e: 'score', pts: 1000, ...pos });
  if (item === 'star') {
    p.starTimer = STAR_FRAMES;
    s.events.push({ e: 'music', id: 'star', who: p.idx });
    return;
  }
  const target = item === 'berry' ? (p.form === 'small' ? 'big' : p.form) : item === 'blossom' ? 'fire' : 'leaf';
  s.events.push({ e: 'sfx', id: item === 'leaf' ? 'puff' : 'powerup' });
  if (target === p.form) return;
  setForm(p, target);
  p.growTimer = 30;
}

export function formActions(s, p, pressed) {
  if (p.dead || p.growTimer > 0) return;
  if (pressed & BTN.B && p.carry < 0) {
    if (p.form === 'fire' && p.fireCooldown === 0 && !p.crouch) {
      const mine = s.entities.filter(e => e.type === 'fireball' && e.owner === p.idx).length;
      if (mine < 2) {
        spawnEntity(s, 'fireball', p.dir > 0 ? p.x + p.w * SUB : p.x - 8 * SUB, p.y + 4 * SUB, { dir: p.dir, owner: p.idx });
        p.fireCooldown = 10;
        s.events.push({ e: 'sfx', id: 'fire' });
      }
    } else if (p.form === 'leaf' && p.tailTimer === 0) {
      p.tailTimer = 18;
      s.events.push({ e: 'sfx', id: 'tail' });
    }
  }
  if (p.form === 'leaf' && p.tailTimer > 6) tailHits(s, p);
}

function tailHits(s, p) {
  const box = { x: p.dir > 0 ? p.x + p.w * SUB : p.x - 12 * SUB, y: p.y + (p.h - 12) * SUB, w: 12, h: 10 };
  for (const e of s.entities) {
    if (e.enemy && !e.dead && e.state !== 'flipped' && overlaps(box, e)) TYPES[e.type].hit?.(e, s, 'tail', p);
  }
  if (p.tailTimer === 17) {
    const tx = Math.floor((box.x + 6 * SUB) / TS), ty = Math.floor((box.y + 5 * SUB) / TS);
    if (INFO[tileAt(s.lv, tx, ty)].solid) hitBlock(s, { tx, ty, by: p.idx, big: true });
  }
}

import { SCREEN_W, SCREEN_H } from '../game/consts.js';
import { SPRITES, PALS } from '../content/sprites/index.js';
import { parseGrid, bakeRGBA } from './sprites.js';
import { PALETTE } from './palette.js';

export function fitScale(winW, winH) {
  return Math.max(1, Math.floor(Math.min(winW / SCREEN_W, winH / SCREEN_H)));
}

export function createScreen(canvas) {
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const fit = () => {
    const s = fitScale(window.innerWidth, window.innerHeight);
    canvas.style.width = `${SCREEN_W * s}px`;
    canvas.style.height = `${SCREEN_H * s}px`;
  };
  window.addEventListener('resize', fit);
  fit();
  return { ctx, canvas };
}

const parsed = new Map(), baked = new Map();

function spriteCanvas(name, palName, flipX) {
  const key = `${name}|${palName}|${flipX ? 1 : 0}`;
  let c = baked.get(key);
  if (c) return c;
  let sp = parsed.get(name);
  if (!sp) { sp = parseGrid(SPRITES[name], name); parsed.set(name, sp); }
  c = document.createElement('canvas');
  c.width = sp.w; c.height = sp.h;
  c.getContext('2d').putImageData(new ImageData(bakeRGBA(sp, PALS[palName], flipX), sp.w, sp.h), 0, 0);
  baked.set(key, c);
  return c;
}

export function blit(ctx, name, palName, x, y, { flipX = false, flipY = false } = {}) {
  const c = spriteCanvas(name, palName, flipX);
  x = Math.round(x); y = Math.round(y);
  if (!flipY) { ctx.drawImage(c, x, y); return; }
  ctx.save(); ctx.translate(x, y + c.height); ctx.scale(1, -1); ctx.drawImage(c, 0, 0); ctx.restore();
}

export function fillNES(ctx, idx, x, y, w, h) {
  ctx.fillStyle = PALETTE[idx];
  ctx.fillRect(x, y, w, h);
}

import { TILE, SUB, SCREEN_W, PLAY_H } from './consts.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function createCamera(p, lv) {
  const c = { x: 0, y: Math.max(0, lv.h * TILE - PLAY_H) };
  updateCamera(c, p, lv, true);
  return c;
}

export function updateCamera(c, p, lv, snap = false) {
  const maxX = Math.max(0, lv.w * TILE - SCREEN_W), maxY = Math.max(0, lv.h * TILE - PLAY_H);
  if (!p.dead) {
    const px = Math.floor((p.x + (p.w * SUB) / 2) / SUB);
    const top = Math.floor(p.y / SUB), bottom = top + p.h;
    if (px > c.x + 144) c.x = px - 144;
    else if (px < c.x + 112) c.x = px - 112;
    // Vertical: SMB3 keeps the view low unless you fly or climb up out of it.
    if ((p.flyTimer > 0 || !p.onGround) && top < c.y + 32) c.y = snap ? top - 32 : c.y - Math.min(4, c.y + 32 - top);
    else if (bottom > c.y + PLAY_H - 40) c.y = snap ? bottom - PLAY_H + 40 : c.y + Math.min(4, bottom - (c.y + PLAY_H - 40));
    else if (p.onGround && c.y < maxY && bottom + 40 <= maxY + PLAY_H) c.y = Math.min(maxY, c.y + 2);
  }
  c.x = clamp(c.x, 0, maxX);
  c.y = clamp(c.y, 0, maxY);
}

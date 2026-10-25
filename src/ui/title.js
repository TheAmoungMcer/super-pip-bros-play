import { BTN } from '../game/consts.js';
import { blit, fillNES } from '../engine/render.js';
import { drawText } from '../draw/text.js';

export const TITLE_OPTIONS = ['1 PLAYER GAME', 'PLAY ONLINE'];

export function createTitle(saves) {
  return { t: 0, mode: 'menu', sel: 0, slot: 0, saves, confirm: false, prev: 0 };
}

export function stepTitle(tt, buttons) {
  const p = buttons & ~tt.prev;
  tt.prev = buttons;
  tt.t++;
  if (tt.t < 90) { if (p) tt.t = 90; return null; }   // any key skips the curtain
  if (tt.mode === 'menu') {
    if (p & BTN.UP) tt.sel = (tt.sel + TITLE_OPTIONS.length - 1) % TITLE_OPTIONS.length;
    if (p & BTN.DOWN) tt.sel = (tt.sel + 1) % TITLE_OPTIONS.length;
    if (p & (BTN.A | BTN.START)) {
      const name = TITLE_OPTIONS[tt.sel];
      if (name === '1 PLAYER GAME') { tt.mode = 'slots'; tt.next = 'solo'; return null; }
      if (name === 'PLAY ONLINE') { tt.mode = 'slots'; tt.next = 'online'; return null; }
      return { action: 'option', name };
    }
    return null;
  }
  if (tt.mode === 'slots') {
    if (tt.confirm) {
      if (p & BTN.A) { tt.confirm = false; return { action: 'erase', slot: tt.slot }; }
      if (p & BTN.B) tt.confirm = false;
      return null;
    }
    if (p & BTN.UP) tt.slot = (tt.slot + 2) % 3;
    if (p & BTN.DOWN) tt.slot = (tt.slot + 1) % 3;
    if (p & BTN.B) tt.mode = 'menu';
    if (p & BTN.SELECT && tt.saves[tt.slot].ok) tt.confirm = true;
    if (p & (BTN.A | BTN.START)) return { action: 'start', slot: tt.slot, next: tt.next };
  }
  return null;
}

export function drawTitle(ctx, tt) {
  fillNES(ctx, 0x0F, 0, 0, 256, 240);
  for (let y = 192; y < 240; y += 8) for (let x = 0; x < 256; x += 8) if (((x + y) >> 3) & 1) fillNES(ctx, 0x30, x, y, 8, 8);
  ctx.save(); ctx.scale(2, 2);
  drawText(ctx, 'SUPER PIP', 29, 17, 'textDark');
  drawText(ctx, 'SUPER PIP', 28, 16, 'textRed');
  drawText(ctx, 'BROS.', 44, 33, 'textDark');
  drawText(ctx, 'BROS.', 43, 32, 'textRed');
  ctx.restore();
  blit(ctx, 'big.stand', 'pip', 96, 160);
  blit(ctx, 'big.stand', 'pep', 144, 160, { flipX: true });
  if (tt.mode === 'menu') {
    TITLE_OPTIONS.forEach((o, i) => drawText(ctx, `${i === tt.sel ? '>' : ' '} ${o}`, 64, 112 + i * 14));
  } else {
    tt.saves.forEach((s, i) => {
      const label = s.ok ? `WORLD ${s.summary.world} x${s.summary.lives}` : s.reason === 'unavailable' ? 'NO SAVING' : 'NEW GAME';
      drawText(ctx, `${i === tt.slot ? '>' : ' '} SLOT ${i + 1} ${label}`, 32, 104 + i * 14);
    });
    drawText(ctx, tt.confirm ? 'ERASE? A=YES B=NO' : 'SELECT=ERASE  B=BACK', 40, 150);
  }
  if (tt.msg) drawText(ctx, tt.msg, 128 - tt.msg.length * 4, 170, 'textRed');
  // Theatre curtain rising, SMB3-style.
  const h = Math.max(0, 240 - tt.t * 3);
  for (let x = 0; x < 256; x += 8) {
    fillNES(ctx, 0x16, x, 0, 8, h);
    fillNES(ctx, 0x06, x + 6, 0, 2, h);
  }
  if (h > 0) for (let x = 0; x < 256; x += 16) fillNES(ctx, 0x06, x, h - 4, 12, 4);
}

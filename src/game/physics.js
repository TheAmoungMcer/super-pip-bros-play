import { TS, SUB } from './consts.js';
import { tileAt } from './level.js';
import { INFO, slopeTop } from './tiles.js';

const STEP = 8 * SUB;
const isWall = (id) => INFO[id].solid && !INFO[id].slope;

export function overlaps(a, b) {
  return a.x < b.x + b.w * SUB && b.x < a.x + a.w * SUB && a.y < b.y + b.h * SUB && b.y < a.y + a.h * SUB;
}

export function moveBody(b, lv) {
  const res = { wall: 0, ceiling: null, landed: false, slope: 0 };
  const W = b.w * SUB, H = b.h * SUB;
  const wasGround = b.onGround;

  // Horizontal
  if (b.vx !== 0) {
    b.x += b.vx;
    const ty0 = Math.floor(b.y / TS);
    const ty1 = Math.floor((b.y + H - 1 - (wasGround ? STEP : 0)) / TS);
    const dir = Math.sign(b.vx);
    const tx = Math.floor((dir > 0 ? b.x + W - 1 : b.x) / TS);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (isWall(tileAt(lv, tx, ty))) {
        b.x = dir > 0 ? tx * TS - W : (tx + 1) * TS;
        b.vx = 0;
        res.wall = dir;
        break;
      }
    }
  }

  // Vertical
  const prevY = b.y;
  b.y += b.vy;
  const x0 = Math.floor((b.x + SUB) / TS), x1 = Math.floor((b.x + W - 1 - SUB) / TS);
  const cx = b.x + (W >> 1), ctx = Math.floor(cx / TS);

  if (b.vy < 0) {
    const ty = Math.floor(b.y / TS);
    let hit = null;
    for (let tx = x0; tx <= x1; tx++) {
      const id = tileAt(lv, tx, ty);
      const blocks = isWall(id) || (INFO[id].hidden && prevY >= (ty + 1) * TS);
      if (blocks && (!hit || tx === ctx)) hit = { tx, ty };
    }
    if (hit) { b.y = (hit.ty + 1) * TS; b.vy = 0; res.ceiling = hit; }
    b.onGround = false;
    return res;
  }

  const foot = b.y + H, prevFoot = prevY + H;
  const reach = foot + (wasGround ? STEP : 0);
  let surface = Infinity, slopeId = 0;

  // Flat tops crossed this frame (or within snap reach)
  for (let ty = Math.ceil(prevFoot / TS); ty <= Math.floor(reach / TS); ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const id = tileAt(lv, tx, ty);
      const info = INFO[id];
      if ((info.solid && !info.slope) || info.semi) {
        const top = ty * TS;
        if (top >= prevFoot && top < surface) { surface = top; slopeId = 0; }
      }
    }
  }
  // Slopes under the centre
  const lx = Math.floor((cx - ctx * TS) / SUB);
  for (let ty = Math.floor((prevFoot - STEP) / TS); ty <= Math.floor(reach / TS); ty++) {
    const id = tileAt(lv, ctx, ty);
    if (!INFO[id].slope) continue;
    const s = ty * TS + slopeTop(id, lx) * SUB;
    if (s >= prevFoot - (wasGround ? STEP : 0) && s <= reach && s <= surface) { surface = s; slopeId = id; }
  }

  if (surface <= reach) {
    b.y = surface - H;
    b.vy = 0;
    res.landed = !wasGround;
    res.slope = slopeId;
    b.onGround = true;
  } else {
    b.onGround = false;
  }
  return res;
}

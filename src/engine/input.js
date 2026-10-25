import { BTN } from '../game/consts.js';

const KEYS = {
  ArrowLeft: BTN.LEFT, ArrowRight: BTN.RIGHT, ArrowUp: BTN.UP, ArrowDown: BTN.DOWN,
  KeyZ: BTN.A, Space: BTN.A, KeyX: BTN.B,
  Enter: BTN.START, ShiftLeft: BTN.SELECT, ShiftRight: BTN.SELECT,
};

export function keyMask(code) { return KEYS[code] || 0; }

export function gamepadMask(gp) {
  if (!gp) return 0;
  const on = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const [ax = 0, ay = 0] = gp.axes;
  let m = 0;
  if (on(0)) m |= BTN.A;
  if (on(1) || on(2) || on(3)) m |= BTN.B;
  if (on(9)) m |= BTN.START;
  if (on(8)) m |= BTN.SELECT;
  if (on(12) || ay < -0.5) m |= BTN.UP;
  if (on(13) || ay > 0.5) m |= BTN.DOWN;
  if (on(14) || ax < -0.5) m |= BTN.LEFT;
  if (on(15) || ax > 0.5) m |= BTN.RIGHT;
  return m;
}

export function edges(prev, cur) {
  return { pressed: cur & ~prev, released: prev & ~cur };
}

export function createInput(target = window, getPads = () => (navigator.getGamepads ? navigator.getGamepads() : [])) {
  let keys = 0, tapped = 0;   // tapped: keys pressed since the last read, so sub-frame taps still count
  target.addEventListener('keydown', (e) => {
    const m = keyMask(e.code);
    if (m) { keys |= m; tapped |= m; e.preventDefault(); }
  });
  target.addEventListener('keyup', (e) => { keys &= ~keyMask(e.code); });
  const clear = () => { keys = 0; tapped = 0; };
  target.addEventListener('blur', clear);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  }
  const readPads = () => { let m = 0; for (const gp of getPads()) m |= gamepadMask(gp); return m; };
  const readKeys = () => { const m = keys | tapped; tapped = 0; return m; };
  return {
    read() { return readKeys() | readPads(); },
    readKeys,
    readPads,
    clear,
  };
}

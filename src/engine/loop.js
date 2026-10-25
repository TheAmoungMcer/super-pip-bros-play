export const STEP_MS = 1000 / 60;
// Hidden tabs get ~1 Hz timers, so the keep-alive tick may catch up a full second of frames.
const HIDDEN_MAX_STEPS = 60;

export function advance(acc, dtMs, maxSteps = 5) {
  acc += Math.min(Math.max(dtMs, 0), 1000);
  let steps = Math.floor(acc / STEP_MS);
  if (steps > maxSteps) { steps = maxSteps; acc = 0; }
  else acc -= steps * STEP_MS;
  return { acc, steps };
}

export function startLoop({ step, draw, keepAliveHidden = () => false, onError = (e) => console.error(e) }) {
  let acc = 0, last = performance.now();
  const tick = (now, maxSteps) => {
    const r = advance(acc, now - last, maxSteps);
    acc = r.acc; last = now;
    for (let i = 0; i < r.steps; i++) step();
    return r.steps;
  };
  // One bad frame must not stop the game forever: report it and keep scheduling frames.
  const safely = (fn) => { try { fn(); } catch (e) { onError(e); } };
  const frame = (now) => {
    safely(() => tick(now, 5));
    safely(draw);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  // rAF stops in hidden tabs; a host (or guest) must keep simulating for the other player.
  setInterval(() => {
    if (document.hidden && keepAliveHidden()) safely(() => tick(performance.now(), HIDDEN_MAX_STEPS));
  }, 50);
}

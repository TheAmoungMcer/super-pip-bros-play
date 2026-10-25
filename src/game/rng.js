// mulberry32. State lives in plain data so sims can be cloned and replayed.
export function rand(rng) {
  let t = (rng.seed = (rng.seed + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(rng, n) {
  return Math.floor(rand(rng) * n);
}

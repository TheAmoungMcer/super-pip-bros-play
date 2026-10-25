export const MAX_ITEMS = 28;

export function addItem(inv, item) {
  if (inv.length >= MAX_ITEMS) return false;
  inv.push(item);
  return true;
}

export function useItem(inv, idx, who) {
  const item = inv[idx];
  let effect = null;
  if (item === 'berry') effect = who.form === 'small' ? { form: 'big' } : null;
  else if (item === 'blossom') effect = who.form === 'fire' ? null : { form: 'fire' };
  else if (item === 'leaf') effect = who.form === 'leaf' ? null : { form: 'leaf' };
  else if (item === 'star') effect = { star: true };
  if (effect) inv.splice(idx, 1);
  return effect;
}

const PAYOUT = [2, 3, 5];
export function addCard(cards, card) {
  if (card < 0) return { cards, lives: 0 };
  const next = [...cards, card];
  if (next.length < 3) return { cards: next, lives: 0 };
  const same = next.every(c => c === next[0]);
  return { cards: [], lives: same ? PAYOUT[next[0]] : 1 };
}

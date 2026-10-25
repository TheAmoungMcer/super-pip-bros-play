import { createScreen } from './engine/render.js';
import { createInput, edges } from './engine/input.js';
import { startLoop } from './engine/loop.js';
import { createAudio } from './engine/audio.js';
import { BTN } from './game/consts.js';
import { createLevelSim, stepLevel } from './game/sim.js';
import { createSession, stepSession, makeSave, autoPause } from './game/session.js';
import { safeStorage, listSaves, readSave, writeSave, eraseSave } from './game/save.js';
import { drawLevel } from './draw/level.js';
import { drawHud } from './draw/hud.js';
import { drawGallery } from './draw/gallery.js';
import { drawSession } from './draw/scenes.js';
import { songFor } from './draw/present.js';
import { createTitle, stepTitle, drawTitle, typeCode } from './ui/title.js';
import { createHost } from './net/host.js';
import { createGuest } from './net/guest.js';
import { hostRoom, joinRoom } from './net/peer.js';
import { WORLDS } from './game/session.js';
import { fillNES } from './engine/render.js';
import { drawText } from './draw/text.js';
import { LEVELS as DEV } from './content/levels/dev.js';
import { LEVELS as W1 } from './content/levels/w1.js';
import { runSelfTest } from './selftest.js';

window.__runSelfTest = runSelfTest;

const { ctx } = createScreen(document.getElementById('screen'));
const input = createInput();
const audio = createAudio();
const storage = safeStorage();
for (const ev of ['keydown', 'pointerdown']) window.addEventListener(ev, () => audio.unlock());
const params = new URLSearchParams(location.search);
// Shown under the canvas if a frame throws; the loop keeps running.
const showError = (e) => {
  console.error(e);
  const el = document.getElementById('msg');
  if (el) el.textContent = `Something went wrong: ${e && e.message ? e.message : e}. Reload the page if the game stops.`;
};

const playEvents = (events) => {
  for (const ev of events) {
    if (ev.e !== 'sfx') continue;
    audio.sfx(ev.id);
    if (ev.id === 'hurry') audio.setTempoScale(1.25);
  }
};

// Dev: sprite gallery (?gallery), arrows change page.
function gallery() {
  let page = 0, prev = 0;
  startLoop({
    step() {
      const m = input.read(); const { pressed } = edges(prev, m); prev = m;
      if (pressed & BTN.RIGHT) page++;
      if (pressed & BTN.LEFT) page = Math.max(0, page - 1);
    },
    draw() { drawGallery(ctx, page); },
  });
}

// Dev: play one level (?level=1-1&form=leaf), restarting on clear or fail.
function devRunner() {
  const defs = { ...DEV, ...W1 };
  const id = params.get('level') || 'dev';
  const form = params.get('form') || 'small';
  let s = createLevelSim(defs[id], { defs, forms: [form] });
  let song = '';
  window.__sim = () => s;
  startLoop({
    step() {
      stepLevel(s, [input.read()]);
      playEvents(s.events);
      const want = s.mode === 'fail' ? '' : s.mode !== 'play' ? 'clear'
        : s.players[0].dead ? 'death' : s.players[0].starTimer > 0 ? 'star' : s.pswitch > 0 ? 'pswitch' : s.lv.music;
      if (want !== song) { song = want; if (want) audio.playSong(want); else audio.stopSong(); }
      if (s.mode === 'done' || s.mode === 'fail') { s = createLevelSim(defs[id], { defs, forms: [form] }); song = ''; }
    },
    draw() {
      drawLevel(ctx, s, 0);
      drawHud(ctx, { world: 1, pmeter: s.players[0].pmeter, flying: s.players[0].flyTimer > 0, coins: s.shared.coins,
        lives: s.shared.lives, score: s.shared.score, time: s.time, cards: [-1, -1, -1], who: 0 });
    },
  });
}

// The game: title -> save slot -> session (solo or hosting), or joining someone else's room.
function game() {
  let mode = 'title', title = createTitle(listSaves(storage)), sess = null, slot = 0, song = '';
  let host = null, guest = null, room = null, banner = '', bannerT = 0, roomCode = '', hadGuest = false;
  window.__game = { get mode() { return mode; }, get sess() { return sess; }, get title() { return title; }, get host() { return host; }, get guest() { return guest; }, get banner() { return banner; } };
  const NAV = BTN.UP | BTN.DOWN | BTN.LEFT | BTN.RIGHT | BTN.START;
  window.addEventListener('pagehide', () => { if (guest) guest.leave(); });
  const focusLost = () => { if (mode === 'game' && sess) autoPause(sess); };
  window.addEventListener('blur', focusLost);
  document.addEventListener('visibilitychange', () => { if (document.hidden) focusLost(); });
  window.addEventListener('keydown', (e) => {
    if (mode !== 'title' || title.mode !== 'code') return;
    if (e.key === 'Escape') title.mode = 'menu';
    else typeCode(title, e.key);
  });
  const begin = (players, saveSlot) => {
    const r = readSave(storage, saveSlot);
    sess = createSession({ players, seed: (Math.random() * 1e9) | 0, save: r.ok ? r.data : null });
    slot = saveSlot; mode = 'game';
  };
  const backToTitle = (msg = '') => {
    if (room) room.close();
    room = null; host = null; guest = null; sess = null;
    mode = 'title'; title = createTitle(listSaves(storage)); title.msg = msg;
  };
  const saveIfDirty = () => {
    if (sess.dirty && sess.scene !== 'level') { writeSave(storage, slot, makeSave(sess)); sess.dirty = false; }
  };
  startLoop({
    keepAliveHidden: () => mode === 'host' || mode === 'join',
    onError: showError,
    step() {
      const coding = mode === 'title' && title.mode === 'code';
      const m = coding ? (input.readPads() | (input.readKeys() & NAV)) : input.read();
      if (mode === 'title') {
        const act = stepTitle(title, m);
        if (act?.action === 'start' && act.next === 'host') {
          begin(1, act.slot);
          mode = 'host';
          host = createHost(sess);
          banner = 'OPENING ROOM...';
          room = hostRoom({
            onCode: (c) => { roomCode = c; banner = `ROOM ${c} - SHARE THIS CODE`; },
            onGuest: (t) => { host.attach(t); hadGuest = true; banner = 'PEP JOINED!'; bannerT = 180; },
            onError: (msg) => { if (!host || !host.connected) banner = `${msg} - PLAYING SOLO`; },
          });
        } else if (act?.action === 'start') begin(1, act.slot);
        else if (act?.action === 'erase') { eraseSave(storage, act.slot); title.saves = listSaves(storage); }
        else if (act?.action === 'join') {
          mode = 'join'; banner = `CONNECTING TO ${act.code}...`;
          room = joinRoom(act.code, {
            onConnected: (t) => { guest = createGuest(t, WORLDS); },
            onError: (msg) => backToTitle(msg),
          });
        }
      } else if (mode === 'game') {
        stepSession(sess, [m, 0]);
        playEvents(sess.events);
        saveIfDirty();
        if (sess.quit) backToTitle();
      } else if (mode === 'host') {
        playEvents(host.step(m));
        if (!host.connected && hadGuest) { hadGuest = false; bannerT = 0; banner = `PEP LEFT - ROOM ${roomCode} STILL OPEN`; }
        if (bannerT > 0 && --bannerT === 0 && host.connected) banner = '';
        saveIfDirty();
        if (sess.quit) backToTitle();
      } else if (mode === 'join' && guest) {
        playEvents(guest.step(m));
        if (guest.status === 'closed') backToTitle(guest.reason === 'timeout' ? 'LOST CONNECTION TO HOST' : 'HOST LEFT THE GAME');
        else if (guest.status === 'rejected') backToTitle('VERSION MISMATCH - RELOAD THE PAGE');
      }
      const view = mode === 'join' ? guest && guest.view() : sess;
      const want = mode === 'title' ? 'title' : view ? songFor(view) : '';
      if (want !== song) { song = want; audio.setTempoScale(1); if (want) audio.playSong(want); else audio.stopSong(); }
    },
    draw() {
      if (mode === 'title') { drawTitle(ctx, title); return; }
      if (mode === 'join') {
        const v = guest && guest.view();
        if (v) drawSession(ctx, v, 1);
        else { fillNES(ctx, 0x0F, 0, 0, 256, 240); drawText(ctx, banner, 128 - banner.length * 4, 112); }
        return;
      }
      drawSession(ctx, sess, 0);
      if (mode === 'host' && banner) { fillNES(ctx, 0x0F, 0, 0, 256, 12); drawText(ctx, banner, 128 - banner.length * 4, 2); }
    },
  });
}

if (params.has('gallery')) gallery();
else if (params.has('level')) devRunner();
else game();

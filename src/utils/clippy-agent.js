/**
 * Clippy agent loader — loads clippyjs, positions agent, runs warmup, fires intro.
 * Vendor patches live in clippy-patches.js.
 * @module utils/clippy-agent
 */

import { send, startLoop, onShowComplete, onIntroComplete } from './clippy-controller.js';
import { applyPatches } from './clippy-patches.js';
import { recordWarmup } from '#pages/home/home-session.js';
import { clippySpeak } from './clippy-speak.js';
import { INTRO_LINES } from '#pages/home/clippy-lines-loop.js';

const log = (...a) => window.__clippyDebugAnim && console.log('[agent]', ...a);

let _introReady = null;
let _resolveIntroReady = null;
let _onDragEnd = null;
let _isHidden = false;
let _introCooling = false;

export function setDragEndHandler(fn) {
  _onDragEnd = fn;
}

export const getAgent = () => window.__clippyAgent || null;
export const isAgentHidden = () => _isHidden;
export const isIntroCooling = () => _introCooling;
export function setAgentHidden(val) {
  _isHidden = val;
}

/** Resolves when the full intro sequence (Show + GetAttention) has completed. */
export const introReady = () => _introReady || Promise.resolve();

export async function initClippy() {
  if (getAgent() || window.__clippyLoading) return;
  window.__clippyLoading = true;

  const [{ initAgent }, { default: Clippy }] = await Promise.all([
    import('clippyjs'),
    import('clippyjs/agents/clippy'),
  ]);
  const a = await initAgent(Clippy);
  document.body.appendChild(a._el);
  window.__clippyAgent = a;
  window.__clippyLoading = false;

  // Fix GoodBye frame 0 — 50% branch skips to frame 34, force linear playthrough
  const gb = a._animator._data.animations.GoodBye;
  gb.frames[0] = { ...gb.frames[0], branching: undefined };

  _positionAgent(a);
  a._el.style.display = 'none';
  setAgentHidden(true);

  applyPatches(a, () => _onDragEnd?.());

  _introReady = new Promise((resolve) => {
    _resolveIntroReady = resolve;
  });
  onShowComplete(() => send({ type: 'play', anim: 'GetAttention', noInterrupt: true }));
  onIntroComplete(() => {
    log('introReady resolved');
    _resolveIntroReady();
    const line = INTRO_LINES[Math.floor(Math.random() * INTRO_LINES.length)];
    clippySpeak(line);
    _introCooling = true;
    setTimeout(
      () => {
        _introCooling = false;
      },
      Math.max(3500, line.trim().split(/\s+/).length * 400),
    );
  });

  await _warmup();

  a._el.style.display = 'block';
  setAgentHidden(false);
  send({ type: 'play', anim: 'Show', noInterrupt: true });
  startLoop();
}

function _positionAgent(a) {
  const paper = document.querySelector('.paper');
  if (!paper) return;
  const rect = paper.getBoundingClientRect();
  const isMobile = window.innerWidth < 600;
  a._el.style.left = `${rect.right - 120 + window.scrollX}px`;
  a._el.style.top = isMobile
    ? `${rect.bottom - 120 + window.scrollY}px`
    : `${rect.top + 40 + window.scrollY}px`;
}

function _warmup() {
  const HIDDEN_MS = 5000;
  const TICK_MS = 500;
  let elapsed = 0;
  return new Promise((resolve) => {
    const tick = setInterval(() => {
      elapsed += TICK_MS;
      recordWarmup(TICK_MS);
      if (elapsed >= HIDDEN_MS) {
        clearInterval(tick);
        resolve();
      }
    }, TICK_MS);
  });
}

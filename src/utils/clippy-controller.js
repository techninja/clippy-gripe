/**
 * Clippy animation controller — public API + loop lifecycle.
 * Loop execution: clippy-loop.js. Decisions: clippy-decide.js.
 * @module utils/clippy-controller
 */

import { getAgent, isAgentHidden } from './clippy-agent.js';
import {
  runLoop,
  setPending,
  sleeping,
  currentType,
  resetLoopCounters,
  setOnShowDone,
  setOnIntroDone,
  setOnCmdDone,
} from './clippy-loop.js';

const _t0 = Date.now();
const _t = () => `+${Date.now() - _t0}ms`;

let _loopRunning = false,
  _loopEnabled = false;

export function send(cmd) {
  if (isAgentHidden()) {
    console.log(`[ctrl] ${_t()} send suppressed (hidden): ${cmd.type} ${cmd.anim ?? ''}`);
    return Promise.resolve();
  }
  console.log(`[ctrl] ${_t()} send: ${cmd.type} ${cmd.anim ?? ''}`);
  setPending(cmd);
  const p = new Promise((r) => setOnCmdDone(r));
  _ensureLoop();
  return p;
}

export function onShowComplete(fn) {
  setOnShowDone(fn);
}
export function onIntroComplete(fn) {
  setOnIntroDone(fn);
}
export const isSleeping = () => sleeping;
export const isHolding = () => currentType === 'hold';
export function startLoop() {
  _loopEnabled = true;
  _ensureLoop();
}
export function resetCounters() {
  resetLoopCounters();
}
export function wake() {
  if (sleeping) send({ type: 'idle' });
}

function _ensureLoop() {
  if (!_loopEnabled || _loopRunning) return;
  const a = getAgent();
  if (!a) return;
  _loopRunning = true;
  runLoop();
}

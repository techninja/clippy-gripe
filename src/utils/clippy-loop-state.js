/**
 * Shared mutable state and callbacks for the Clippy animation loop.
 * @module utils/clippy-loop-state
 */

import { decide, GOAD_COOLDOWN_ANIMS } from './clippy-decide.js';
import { session } from '#pages/home/home-session.js';

export let pending = null;
export let sleeping = false;
export let currentType = null;
export let idleAnimCount = 0;
export let lastGoatAnim = -GOAD_COOLDOWN_ANIMS;

export function setPending(v) {
  pending = v;
}
export function setCurrentType(v) {
  currentType = v;
}
export function setSleeping(v) {
  sleeping = v;
  window.__clippySleeping = v;
}
export function resetLoopCounters() {
  idleAnimCount = 0;
  lastGoatAnim = -GOAD_COOLDOWN_ANIMS;
}
export function resetGoatAnim() {
  lastGoatAnim = -GOAD_COOLDOWN_ANIMS;
}
export function incIdleAnimCount() {
  idleAnimCount++;
}
export function resetIdleAnimCount() {
  idleAnimCount = 0;
}

let _onShowDone = null,
  _onIntroDone = null,
  _onCmdDone = null;
export function setOnShowDone(fn) {
  _onShowDone = fn;
}
export function setOnIntroDone(fn) {
  _onIntroDone = fn;
}
export function setOnCmdDone(fn) {
  _onCmdDone = fn;
}
export function fireCmdDone() {
  if (_onCmdDone) {
    const cb = _onCmdDone;
    _onCmdDone = null;
    cb();
  }
}

export const animCbs = {
  Show: () => {
    if (_onShowDone) {
      const cb = _onShowDone;
      _onShowDone = null;
      cb();
    }
  },
  GetAttention: () => {
    if (_onIntroDone) {
      const cb = _onIntroDone;
      _onIntroDone = null;
      cb();
    }
  },
};

export function loopDecide() {
  const cmd = decide(idleAnimCount, lastGoatAnim);
  if (cmd.type === 'goad') {
    lastGoatAnim = idleAnimCount;
    session.goatCount++;
  }
  return cmd;
}

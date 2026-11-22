/**
 * Clippy animation loop — executes commands from the controller queue.
 * @module utils/clippy-loop
 */

import { getAgent } from './clippy-agent.js';
import { clippySpeak, clippyAside } from './clippy-speak.js';
import { playToEnd, playLinear, playHold, playSleep } from './clippy-anims.js';
import { decide, pickIdleAnim, shouldEscalate, GOAD_COOLDOWN_ANIMS } from './clippy-decide.js';
import { session, recordIdleAnim, recordReaction } from '#pages/home/home-session.js';
import { SLEEP_LINES } from '#pages/home/clippy-lines-loop.js';
import { doStorm } from './clippy-storm.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const _t0 = Date.now();
const _t = () => `+${Date.now() - _t0}ms`;
const log = (...a) => console.log('[ctrl:anim]', _t(), ...a);

export let pending = null;
export let sleeping = false;
export let currentType = null;
export let idleAnimCount = 0;
export let lastGoatAnim = -GOAD_COOLDOWN_ANIMS;

export function setPending(v) {
  pending = v;
}
export function resetLoopCounters() {
  idleAnimCount = 0;
  lastGoatAnim = -GOAD_COOLDOWN_ANIMS;
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

const _animCbs = {
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

function _decide() {
  const cmd = decide(idleAnimCount, lastGoatAnim);
  if (cmd.type === 'goad') {
    lastGoatAnim = idleAnimCount;
    session.goatCount++;
  }
  return cmd;
}

export async function runLoop() {
  const a = getAgent();
  console.log(`[ctrl] ${_t()} _loop started`);
  while (true) {
    const hadPending = pending !== null;
    const cmd = pending ?? _decide();
    pending = null;
    currentType = cmd.type;
    console.log(
      `[ctrl] ${_t()} iter: ${hadPending ? 'queued' : 'decided'} ${cmd.type} ${cmd.anim ?? ''} tired=${session.tiredness.toFixed(3)} bored=${session.boredom.toFixed(3)}`,
    );

    if (cmd.text) clippySpeak(cmd.text);
    if (cmd.aside) clippyAside(cmd.aside, 5000);
    if (!cmd.noPersonality && cmd.type !== 'idle' && cmd.type !== 'goad') recordReaction();

    switch (cmd.type) {
      case 'goad': {
        const { name, minPlayMs } = pickIdleAnim();
        await playToEnd(a, name, minPlayMs, _animCbs);
        idleAnimCount++;
        recordIdleAnim(1000);
        session.tiredness = Math.max(0, session.tiredness - 0.15);
        session.boredom = Math.max(0, session.boredom - 0.1);
        pending = pending ?? { type: 'idle' };
        break;
      }
      case 'play':
        if (cmd.noInterrupt) await playToEnd(a, cmd.anim, 0, _animCbs);
        else await playLinear(a, cmd.anim, () => pending !== null, _animCbs);
        break;
      case 'hold':
        await playHold(
          a,
          cmd.anim,
          () => pending !== null,
          () => {
            recordIdleAnim(1000);
            idleAnimCount++;
            const next = _decide();
            if (next.type !== 'hold') pending = next;
          },
        );
        break;
      case 'sleep':
        sleeping = true;
        window.__clippySleeping = true;
        clippySpeak(pick(SLEEP_LINES));
        await playSleep(a, () => pending !== null);
        sleeping = false;
        window.__clippySleeping = false;
        session.tiredness = Math.max(0, session.tiredness - 0.5);
        session.boredom = 0;
        idleAnimCount = 0;
        lastGoatAnim = -GOAD_COOLDOWN_ANIMS;
        break;
      case 'storm':
        await doStorm(a, _animCbs, () => {
          idleAnimCount = 0;
        });
        break;
      default: {
        await _restPause(2000, 7000);
        if (pending !== null) break;
        const t0 = Date.now();
        const { name: animName, minPlayMs } = pickIdleAnim();
        log(`idle #${idleAnimCount + 1}: ${animName} (minPlay=${minPlayMs}ms)`);
        await playToEnd(a, animName, minPlayMs, _animCbs);
        const dur = Date.now() - t0;
        idleAnimCount++;
        recordIdleAnim(dur);
        console.log(
          `[ctrl:personality] ${_t()} after idle #${idleAnimCount} (${dur}ms): boredom=${session.boredom.toFixed(3)} tired=${session.tiredness.toFixed(3)}`,
        );
        break;
      }
    }
    currentType = null;
    if (_onCmdDone) {
      const cb = _onCmdDone;
      _onCmdDone = null;
      cb();
    }
  }
}

function _restPause(minMs, maxMs) {
  const dur = minMs + Math.random() * (maxMs - minMs);
  log(`rest: ${Math.round(dur)}ms`);
  return new Promise((resolve) => {
    let elapsed = 0;
    const tick = setInterval(() => {
      elapsed += 500;
      recordIdleAnim(500);
      if (pending !== null || elapsed >= dur) {
        clearInterval(tick);
        resolve();
        return;
      }
      if (shouldEscalate()) {
        pending = _decide();
        clearInterval(tick);
        resolve();
      }
    }, 500);
  });
}

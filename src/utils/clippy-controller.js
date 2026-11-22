/**
 * Clippy animation controller — single loop, decide-then-execute.
 * Personality decisions: clippy-decide.js. Primitives: clippy-anims.js.
 * @module utils/clippy-controller
 */

import { getAgent, setAgentHidden, isAgentHidden } from './clippy-agent.js';
import { clippySpeak, clippyAside } from './clippy-speak.js';
import { playToEnd, playLinear, playHold, playSleep } from './clippy-anims.js';
import { decide, pickIdleAnim, shouldEscalate } from './clippy-decide.js';
import { session, recordIdleAnim, recordReaction, recordStorm } from '#pages/home/home-session.js';
import { SLEEP_LINES, STORM_OFF_LINES, RETURN_LINES } from '#pages/home/clippy-lines-loop.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const _t0 = Date.now();
const _t = () => `+${Date.now() - _t0}ms`;
const log = (...a) => console.log('[ctrl:anim]', _t(), ...a);

let _pending = null,
  _loopRunning = false,
  _loopEnabled = false;
let _sleeping = false,
  _currentType = null,
  _onCmdDone = null;
let _onShowDone = null,
  _onIntroDone = null;
let _lastGoatAnim = 0,
  _idleAnimCount = 0;

// ─── Public API ───────────────────────────────────────────────────────────────

export function send(cmd) {
  if (isAgentHidden()) {
    console.log(`[ctrl] ${_t()} send suppressed (hidden): ${cmd.type} ${cmd.anim ?? ''}`);
    return Promise.resolve();
  }
  console.log(`[ctrl] ${_t()} send: ${cmd.type} ${cmd.anim ?? ''}`);
  _pending = cmd;
  const p = new Promise((r) => {
    _onCmdDone = r;
  });
  _ensureLoop();
  return p;
}

export function onShowComplete(fn) {
  _onShowDone = fn;
}
export function onIntroComplete(fn) {
  _onIntroDone = fn;
}
export const isSleeping = () => _sleeping;
export const isHolding = () => _currentType === 'hold';
export function startLoop() {
  _loopEnabled = true;
  _ensureLoop();
}
export function resetCounters() {
  _idleAnimCount = 0;
  _lastGoatAnim = 0;
}
export function wake() {
  if (_sleeping) send({ type: 'idle' });
}

// ─── Loop ─────────────────────────────────────────────────────────────────────

function _ensureLoop() {
  if (!_loopEnabled || _loopRunning) return;
  const a = getAgent();
  if (!a) return;
  _loopRunning = true;
  _loop(a);
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
  const cmd = decide(_idleAnimCount, _lastGoatAnim);
  if (cmd.type === 'goad') {
    _lastGoatAnim = _idleAnimCount;
    session.goatCount++;
  }
  return cmd;
}

async function _loop(a) {
  console.log(`[ctrl] ${_t()} _loop started`);
  while (true) {
    const hadPending = _pending !== null;
    const cmd = _pending ?? _decide();
    _pending = null;
    _currentType = cmd.type;
    console.log(
      `[ctrl] ${_t()} iter: ${hadPending ? 'queued' : 'decided'} ${cmd.type} ${cmd.anim ?? ''} tired=${session.tiredness.toFixed(3)} bored=${session.boredom.toFixed(3)}`,
    );

    if (cmd.text) clippySpeak(cmd.text);
    if (cmd.aside) clippyAside(cmd.aside, 5000);
    if (cmd.type !== 'idle' && cmd.type !== 'goad') recordReaction();

    switch (cmd.type) {
      case 'goad': {
        const { name, minPlayMs } = pickIdleAnim();
        await playToEnd(a, name, minPlayMs, _animCbs);
        _idleAnimCount++;
        recordIdleAnim(1000);
        session.tiredness = Math.max(0, session.tiredness - 0.15);
        session.boredom = Math.max(0, session.boredom - 0.1);
        _pending = _pending ?? { type: 'idle' };
        break;
      }
      case 'play':
        if (cmd.noInterrupt) await playToEnd(a, cmd.anim, 0, _animCbs);
        else await playLinear(a, cmd.anim, () => _pending !== null, _animCbs);
        break;
      case 'hold':
        await playHold(
          a,
          cmd.anim,
          () => _pending !== null,
          () => {
            recordIdleAnim(1000);
            _idleAnimCount++;
            const next = _decide();
            if (next.type !== 'hold') _pending = next;
          },
        );
        break;
      case 'sleep':
        _sleeping = true;
        window.__clippySleeping = true;
        clippySpeak(pick(SLEEP_LINES));
        await playSleep(a, () => _pending !== null);
        _sleeping = false;
        window.__clippySleeping = false;
        session.tiredness = Math.max(0, session.tiredness - 0.5);
        session.boredom = 0;
        _idleAnimCount = 0;
        _lastGoatAnim = 0;
        break;
      case 'storm':
        await _doStorm(a);
        break;
      default: {
        await _restPause(a, 2000, 7000);
        if (_pending !== null) break;
        const t0 = Date.now();
        const { name: animName, minPlayMs } = pickIdleAnim();
        log(`idle #${_idleAnimCount + 1}: ${animName} (minPlay=${minPlayMs}ms)`);
        await playToEnd(a, animName, minPlayMs, _animCbs);
        const dur = Date.now() - t0;
        _idleAnimCount++;
        recordIdleAnim(dur);
        console.log(
          `[ctrl:personality] ${_t()} after idle #${_idleAnimCount} (${dur}ms): boredom=${session.boredom.toFixed(3)} tired=${session.tiredness.toFixed(3)}`,
        );
        break;
      }
    }
    _currentType = null;
    if (_onCmdDone) {
      const cb = _onCmdDone;
      _onCmdDone = null;
      cb();
    }
  }
}

function _restPause(a, minMs, maxMs) {
  const dur = minMs + Math.random() * (maxMs - minMs);
  log(`rest: ${Math.round(dur)}ms`);
  return new Promise((resolve) => {
    let elapsed = 0;
    const tick = setInterval(() => {
      elapsed += 500;
      recordIdleAnim(500);
      if (_pending !== null || elapsed >= dur) {
        clearInterval(tick);
        resolve();
        return;
      }
      if (shouldEscalate()) {
        _pending = _decide();
        clearInterval(tick);
        resolve();
      }
    }, 500);
  });
}

async function _doStorm(a) {
  recordStorm();
  _idleAnimCount = 0;
  const line = pick(STORM_OFF_LINES);
  clippySpeak(line);
  await wait(Math.max(3500, line.trim().split(/\s+/).length * 400) + 300);
  await playToEnd(a, 'Wave');
  await playToEnd(a, 'Hide');
  a._el.style.display = 'none';
  setAgentHidden(true);
  await wait(30000);
  a._el.style.display = 'block';
  setAgentHidden(false);
  await playToEnd(a, 'GetAttention', 0, _animCbs);
  clippySpeak(pick(RETURN_LINES));
}

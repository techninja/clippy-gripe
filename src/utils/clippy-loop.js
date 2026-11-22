/**
 * Clippy animation loop — executes commands from the controller queue.
 * @module utils/clippy-loop
 */

import { getAgent } from './clippy-agent.js';
import { clippySpeak, clippyAside } from './clippy-speak.js';
import { playToEnd, playLinear, playHold, playSleep } from './clippy-anims.js';
import { pickIdleAnim, shouldEscalate } from './clippy-decide.js';
import { session, recordIdleAnim, recordReaction } from '#pages/home/home-session.js';
import { SLEEP_LINES } from '#pages/home/clippy-lines-loop.js';
import { doStorm } from './clippy-storm.js';
import {
  pending,
  setPending,
  sleeping,
  setSleeping,
  currentType,
  setCurrentType,
  idleAnimCount,
  resetLoopCounters,
  resetGoatAnim,
  incIdleAnimCount,
  resetIdleAnimCount,
  animCbs,
  loopDecide,
  fireCmdDone,
} from './clippy-loop-state.js';

export { pending, setPending, sleeping, currentType, resetLoopCounters };
export { setOnShowDone, setOnIntroDone, setOnCmdDone } from './clippy-loop-state.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const _t0 = Date.now();
const _t = () => `+${Date.now() - _t0}ms`;
const log = (...a) => console.log('[ctrl:anim]', _t(), ...a);

export async function runLoop() {
  const a = getAgent();
  console.log(`[ctrl] ${_t()} _loop started`);
  while (true) {
    const hadPending = pending !== null;
    const cmd = pending ?? loopDecide();
    setPending(null);
    setCurrentType(cmd.type);
    console.log(
      `[ctrl] ${_t()} iter: ${hadPending ? 'queued' : 'decided'} ${cmd.type} ${cmd.anim ?? ''} tired=${session.tiredness.toFixed(3)} bored=${session.boredom.toFixed(3)}`,
    );

    if (cmd.text) clippySpeak(cmd.text);
    if (cmd.aside) clippyAside(cmd.aside, 5000);
    if (!cmd.noPersonality && cmd.type !== 'idle' && cmd.type !== 'goad') recordReaction();

    switch (cmd.type) {
      case 'goad': {
        const { name, minPlayMs } = pickIdleAnim();
        await playToEnd(a, name, minPlayMs, animCbs);
        incIdleAnimCount();
        recordIdleAnim(1000);
        session.tiredness = Math.max(0, session.tiredness - 0.15);
        session.boredom = Math.max(0, session.boredom - 0.1);
        setPending(pending ?? { type: 'idle' });
        break;
      }
      case 'play':
        if (cmd.noInterrupt) await playToEnd(a, cmd.anim, 0, animCbs);
        else await playLinear(a, cmd.anim, () => pending !== null, animCbs);
        break;
      case 'hold':
        await playHold(
          a,
          cmd.anim,
          () => pending !== null,
          () => {
            recordIdleAnim(1000);
            incIdleAnimCount();
            const next = loopDecide();
            if (next.type !== 'hold') setPending(next);
          },
        );
        break;
      case 'sleep':
        setSleeping(true);
        clippySpeak(pick(SLEEP_LINES));
        await playSleep(a, () => pending !== null);
        setSleeping(false);
        session.tiredness = Math.max(0, session.tiredness - 0.5);
        session.boredom = 0;
        resetIdleAnimCount();
        resetGoatAnim();
        break;
      case 'storm':
        await doStorm(a, animCbs, resetIdleAnimCount);
        break;
      default: {
        await _restPause(2000, 7000);
        if (pending !== null) break;
        const t0 = Date.now();
        const { name: animName, minPlayMs } = pickIdleAnim();
        log(`idle #${idleAnimCount + 1}: ${animName} (minPlay=${minPlayMs}ms)`);
        await playToEnd(a, animName, minPlayMs, animCbs);
        const dur = Date.now() - t0;
        incIdleAnimCount();
        recordIdleAnim(dur);
        console.log(
          `[ctrl:personality] ${_t()} after idle #${idleAnimCount} (${dur}ms): boredom=${session.boredom.toFixed(3)} tired=${session.tiredness.toFixed(3)}`,
        );
        break;
      }
    }
    setCurrentType(null);
    fireCmdDone();
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
        setPending(loopDecide());
        clearInterval(tick);
        resolve();
      }
    }, 500);
  });
}

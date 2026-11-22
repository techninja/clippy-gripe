/**
 * Storm sequence — Clippy rage-quits and returns after a cooldown.
 * @module utils/clippy-storm
 */

import { setAgentHidden } from './clippy-agent.js';
import { clippySpeak } from './clippy-speak.js';
import { playToEnd } from './clippy-anims.js';
import { recordStorm } from '#pages/home/home-session.js';
import { STORM_OFF_LINES, RETURN_LINES } from '#pages/home/clippy-lines-loop.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function doStorm(a, animCbs, onCounterReset) {
  recordStorm();
  onCounterReset();
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
  await playToEnd(a, 'GetAttention', 0, animCbs);
  clippySpeak(pick(RETURN_LINES));
}

/**
 * Blank-page idle watcher — hassles the user for not typing.
 * @module pages/home/home-idle
 */

import { getAgent, initClippy } from '#utils/clippy-agent.js';
import { clippySpeak, clippyAside } from '#utils/clippy-speak.js';
import { BLANK_PAGE_LINES, BLANK_PAGE_ASIDE_LINES } from './clippy-lines.js';

let idleTimer = null;
let sleeping = false;
const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];
const paperLen = (host) => host.querySelector('.paper')?.innerText?.trim().length ?? 0;

export function wakeIfSleeping() {
  if (!sleeping) return;
  sleeping = false;
  getAgent()?.play('GetAttention');
}

export function startIdleWatch(host) {
  clearTimeout(idleTimer);
  sleeping = false;
  // Stage 1 — appear silently after 5s
  idleTimer = setTimeout(() => {
    if (paperLen(host) >= 15) return;
    initClippy().then(() => {
      getAgent()?.play('Thinking');
      // Stage 2 — goad after another 5s
      idleTimer = setTimeout(() => {
        if (paperLen(host) >= 15) return;
        clippySpeak(pick(BLANK_PAGE_LINES));
        clippyAside(pick(BLANK_PAGE_ASIDE_LINES), 5000);
        // Stage 3 — fall asleep after the aside has had time to show
        idleTimer = setTimeout(() => {
          if (paperLen(host) >= 15) return;
          sleeping = true;
          getAgent()?.play('IdleSnooze');
        }, 11000);
      }, 5000);
    });
  }, 5000);
}

export function cancelIdleWatch() {
  clearTimeout(idleTimer);
  sleeping = false;
}

/**
 * Blank-page idle watcher — hassles the user for not typing.
 * @module pages/home/home-idle
 */

import { getAgent, initClippy } from '#utils/clippy-agent.js';
import { clippySpeak, clippyAside } from '#utils/clippy-speak.js';
import { BLANK_PAGE_LINES, BLANK_PAGE_ASIDE_LINES, HAS_TEXT_IDLE_LINES, HAS_TEXT_IDLE_ASIDE_LINES } from './clippy-lines.js';

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
        const hasText = paperLen(host) > 0;
        const lines = hasText ? HAS_TEXT_IDLE_LINES : BLANK_PAGE_LINES;
        const asideLines = hasText ? HAS_TEXT_IDLE_ASIDE_LINES : BLANK_PAGE_ASIDE_LINES;
        clippySpeak(pick(lines));
        clippyAside(pick(asideLines), 5000);
        // Stage 3 — fall asleep, then restart goad cycle
        idleTimer = setTimeout(() => {
          if (paperLen(host) >= 15) return;
          sleeping = true;
          getAgent()?.play('IdleSnooze');
          idleTimer = setTimeout(() => {
            if (paperLen(host) >= 15 || !sleeping) return;
            sleeping = false;
            const l2 = paperLen(host) > 0 ? HAS_TEXT_IDLE_LINES : BLANK_PAGE_LINES;
            const a2 = paperLen(host) > 0 ? HAS_TEXT_IDLE_ASIDE_LINES : BLANK_PAGE_ASIDE_LINES;
            clippySpeak(pick(l2));
            clippyAside(pick(a2), 5000);
            idleTimer = setTimeout(() => {
              if (paperLen(host) >= 15) return;
              sleeping = true;
              getAgent()?.play('IdleSnooze');
            }, 11000);
          }, 20000);
        }, 11000);
      }, 5000);
    });
  }, 5000);
}

export function cancelIdleWatch() {
  clearTimeout(idleTimer);
  sleeping = false;
}

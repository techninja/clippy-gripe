/**
 * Clippy wake helpers.
 * The idle/goad/sleep cycle is now owned entirely by the controller loop
 * via _decide(). This module only handles explicit wake-from-sleep reactions.
 * @module pages/home/home-idle
 */

import { send, isSleeping } from '#utils/clippy-controller.js';
import { recordWake } from './home-session.js';
import { WAKE_LINES, WAKE_ASIDE_LINES } from './clippy-lines.js';

const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];

let _waking = false;

/** Called on input when Clippy is sleeping — wakes him with a reaction. */
export function wakeIfSleeping() {
  if (!isSleeping() || _waking) return;
  _waking = true;
  recordWake();
  send({
    type: 'play',
    anim: 'GetAttention',
    text: pick(WAKE_LINES),
    aside: pick(WAKE_ASIDE_LINES),
  }).finally(() => {
    _waking = false;
  });
}

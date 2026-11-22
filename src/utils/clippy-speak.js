/**
 * Clippy speak and cancel utilities.
 * @module utils/clippy-speak
 */

import { getAgent, isAgentHidden } from './clippy-agent.js';
import { isSleeping } from './clippy-controller.js';

let asideTimer = null;

/** Cancel pending aside timer and stop word-by-word balloon typing.
 *  Does NOT touch the animation — the controller owns that. */
export function cancelPending() {
  window.clearTimeout(asideTimer);
  asideTimer = null;
  const a = getAgent();
  if (!a) return;
  window.clearTimeout(a._balloon._loop);
  // Do NOT call a.stop() — that calls exitAnimation() which stomps the controller loop.
}

/** Cancel everything including any visible balloon — call only when speaking. */
function cancelAll() {
  cancelPending();
  const a = getAgent();
  if (!a) return;
  a._balloon._active = false;
  a._balloon._hidden = true;
  a._balloon._balloon.style.display = 'none';
}

/** Speak a line — cancels everything pending first. Silenced while sleeping or hidden. */
export function clippySpeak(text, aside = false) {
  const a = getAgent();
  if (!a || isSleeping() || isAgentHidden()) return;
  if (!aside) cancelAll();
  a.speak(text, false);
}

/** Schedule an aside, cancellable. */
export function clippyAside(text, delay) {
  window.clearTimeout(asideTimer);
  asideTimer = window.setTimeout(() => clippySpeak(text, true), delay);
}

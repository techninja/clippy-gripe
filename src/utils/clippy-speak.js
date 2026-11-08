/**
 * Clippy speak and cancel utilities.
 * @module utils/clippy-speak
 */

import { getAgent } from './clippy-agent.js';

let asideTimer = null;

/** Cancel pending timers and animation — does NOT hide an active balloon. */
export function cancelPending() {
  window.clearTimeout(asideTimer);
  asideTimer = null;
  const a = getAgent();
  if (!a) return;
  window.clearTimeout(a._balloon._loop);
  a.stop();
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

/** Speak a line — cancels everything pending first. */
export function clippySpeak(text, aside = false) {
  const a = getAgent();
  if (!a) return;
  if (!aside) cancelAll();
  a.speak(text, false);
}

/** Schedule an aside, cancellable. */
export function clippyAside(text, delay) {
  window.clearTimeout(asideTimer);
  asideTimer = window.setTimeout(() => clippySpeak(text, true), delay);
}

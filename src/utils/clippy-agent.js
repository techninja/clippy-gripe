/**
 * Clippy agent loader and speech utilities.
 * Agent is stored on window to survive hot reloads.
 * @module utils/clippy-agent
 */

/** @returns {any|null} */
export const getAgent = () => window.__clippyAgent || null;

/** Load clippyjs from CDN, append to body, position near paper top-right. */
export async function initClippy() {
  if (getAgent()) return;
  if (window.__clippyLoading) return;
  window.__clippyLoading = true;
  const [{ initAgent }, { default: Clippy }] = await Promise.all([
    import('https://unpkg.com/clippyjs@0.1.0/dist/index.mjs'),
    import('https://unpkg.com/clippyjs@0.1.0/dist/agents/clippy/index.mjs'),
  ]);
  const a = await initAgent(Clippy);
  document.body.appendChild(a._el);
  window.__clippyAgent = a;
  window.__clippyLoading = false;

  const paper = document.querySelector('.paper');
  if (paper) {
    const rect = paper.getBoundingClientRect();
    a._el.style.left = `${rect.right - 120 + window.scrollX}px`;
    a._el.style.top = `${rect.top + 40 + window.scrollY}px`;
  }

  a.show();
  a.play('GetAttention');
}

/**
 * Speak with bubble held open long enough to read (~60ms per char, min 3s).
 * @param {string} text
 */
export function clippySpeak(text) {
  const a = getAgent();
  if (!a) return;
  const ms = Math.max(3000, text.length * 60);
  a.speak(text, true);
  setTimeout(() => a._balloon.hide(), ms);
}

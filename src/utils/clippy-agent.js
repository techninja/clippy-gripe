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
    import('clippyjs'),
    import('clippyjs/agents/clippy'),
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
  a._balloon.WORD_SPEAK_TIME = 60;
  a._balloon.CLOSE_BALLOON_DELAY = 4000;

  // Widen balloon and fix sizing — skip word-by-word typing so the balloon
  // measures at full size before positioning, eliminating the grow-from-left bug.
  a._balloon._content.style.maxWidth = '320px';
  a._balloon._content.style.minWidth = '160px';
  a._balloon._sayWords = function (text, hold, complete) {
    this._content.style.height = 'auto';
    this._content.style.width = 'auto';
    this._content.textContent = text;
    this._active = true;
    this._hold = hold;
    this._complete = complete;
    this.reposition();
    if (!hold) {
      this._loop = window.setTimeout(() => {
        this._active = false;
        complete();
        this.hide();
      }, this.CLOSE_BALLOON_DELAY);
    }
  };

  // Shift balloon left after full-size reposition
  const _origPosition = a._balloon._position.bind(a._balloon);
  a._balloon._position = function (side) {
    _origPosition(side);
    this._balloon.style.left = parseFloat(this._balloon.style.left) - 30 + 'px';
  };
}

/**
 * Speak a line — clears any queued/active speech first so we never block.
 * Balloon auto-hides after clippyjs CLOSE_BALLOON_DELAY (2s post-last-word).
 * @param {string} text
 */
export function clippySpeak(text) {
  const a = getAgent();
  if (!a) return;
  a.stop();
  a.speak(text, false);
}

/**
 * Vendor patches applied to the clippyjs agent after load.
 * Balloon timing, drag/touch handling, balloon positioning.
 * @module utils/clippy-patches
 */

/** Patch balloon speak timing, drag finish, touch drag, and balloon positioning. */
export function applyPatches(a, onDragEndFn) {
  _patchBalloon(a);
  _patchDrag(a, onDragEndFn);
  _patchTouch(a);
  _patchPosition(a);
}

function _patchBalloon(a) {
  a._balloon.WORD_SPEAK_TIME = 60;
  a._balloon._content.style.maxWidth = '320px';
  a._balloon._content.style.minWidth = '160px';
  let balloonTimer = null;

  a._balloon._sayWords = function (text, hold, complete) {
    window.clearTimeout(balloonTimer);
    window.clearTimeout(this._loop);
    this._content.style.height = 'auto';
    this._content.style.width = 'auto';
    this._content.textContent = text;
    this._active = true;
    this._hold = hold;
    this._complete = complete;
    this.reposition();
    const readMs = Math.max(3500, text.trim().split(/\s+/).length * 400);
    balloonTimer = window.setTimeout(() => {
      this._active = false;
      this._hidden = true;
      this._balloon.style.display = 'none';
      complete();
    }, readMs);
  };

  setInterval(() => {
    if (a._balloon._balloon.style.display !== 'none' && !a._balloon._active) {
      window.clearTimeout(balloonTimer);
      a._balloon._hidden = true;
      a._balloon._balloon.style.display = 'none';
    }
  }, 5000);
}

function _patchDrag(a, onDragEndFn) {
  a._finishDrag = function () {
    window.clearTimeout(this._dragUpdateLoop);
    window.removeEventListener('mousemove', this._moveHandle);
    window.removeEventListener('mouseup', this._upHandle);
    this._balloon.show();
    this.reposition();
    this._animator.resume();
    onDragEndFn?.();
  };
}

function _patchTouch(a) {
  a._el.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      a.pause();
      a._balloon.hide(true);
      const t = e.touches[0];
      const o = a._el.getBoundingClientRect();
      const offset = { left: t.clientX - o.left, top: t.clientY - o.top };

      const onMove = (ev) => {
        ev.preventDefault();
        const touch = ev.touches[0];
        a._el.style.left = touch.clientX - offset.left + 'px';
        a._el.style.top = touch.clientY - offset.top + 'px';
      };
      const onEnd = () => {
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
        a.reposition();
        a.resume();
      };
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    },
    { passive: false },
  );
}

function _patchPosition(a) {
  const _orig = a._balloon._position.bind(a._balloon);
  a._balloon._position = function (side) {
    _orig(side);
    const b = this._balloon;
    const margin = 8;
    const bW = b.offsetWidth;
    const bH = b.offsetHeight;
    const rect = a._el.getBoundingClientRect();
    let left = parseFloat(b.style.left) - 30;
    left = Math.max(margin, Math.min(left, window.innerWidth - bW - margin));
    let top = rect.top + window.scrollY - bH - 16;
    if (top < margin) top = rect.bottom + window.scrollY + 8;
    top = Math.min(top, window.innerHeight + window.scrollY - bH - margin);
    b.style.left = left + 'px';
    b.style.top = top + 'px';
  };
}

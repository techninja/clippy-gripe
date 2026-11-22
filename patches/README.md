# patches/

Unified diffs against vendored npm packages in `src/vendor/`.

Patches are **applied automatically** on `npm install` via `postinstall` →
`scripts/setup.js` → `scripts/apply-patches.js`. No manual step needed.

To regenerate after editing a vendored file:

```bash
diff -u node_modules/clippyjs/dist/index.mjs src/vendor/clippyjs/index.mjs > patches/clippyjs-index.patch
```

---

## clippyjs-index.patch

Six changes to `clippyjs/dist/index.mjs`, vendored at `src/vendor/clippyjs/index.mjs`.

### 1. Debug helpers (`_dbg`, `_t`)
Added module-level helpers gated on `window.__clippyDebug`. Replaces the
unconditional `console.log` that was already in `showAnimation`.

### 2. `exitAnimation` logging
Adds `_dbg` call so we can trace when exit is triggered and from where.

### 3. `showAnimation`: clear pending `_loop` timer on entry
Original only called `_step()` on first start; subsequent calls left the
previous animation's `setTimeout` chain running, causing the old animation
to fire one more `_step` after being replaced. Fix: `clearTimeout(this._loop)`
before switching animation, then schedule `_step` via `setTimeout(0)` so the
new animation starts on the next tick (consistent with the first-start path).

### 4. `_step`: fix dangling `else` on `endCallback`
Original code had an ambiguous `if ... if ... else` that attached the `else`
to the inner `if`, not the outer one — meaning `endCallback` could fire with
`EXITED` state even when `useExitBranching && !exiting` was true. Wrapped in
braces and added `_dbg` logging.

### 5. `play()`: bypass queue, drop `timeout` param
Original queued every `play()` call and supported a `timeout` that would
force-exit after N ms. We own the animation lifecycle via the pending-slot
loop in `clippy-controller.js`, so the queue and timeout are redundant and
harmful. New signature: `play(animation, cb)` — calls `showAnimation` directly.

### 6. `_onQueueEmpty` / `_onIdleComplete` / `_getIdleAnimation` removed
The original vendor drove its own idle loop from `_onQueueEmpty`. We replaced
this entirely with the `_loop()` in `clippy-controller.js`. Keeping the vendor
idle loop running in parallel caused double-idle and race conditions.
`_onQueueEmpty` is stubbed to a no-op; the three idle methods are removed.
`_isIdleAnimation` is kept (used by `animate()`).

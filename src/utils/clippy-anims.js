/**
 * Low-level animation primitives for the Clippy controller loop.
 * All functions take the agent `a` and return Promises.
 * @module utils/clippy-anims
 */

const log = (...a) => console.log('[ctrl:anim]', ...a);

/** Play an anim to clean completion.
 *  minPlayMs=0 → waits for natural EXITED. Otherwise exits after minPlayMs. */
export function playToEnd(a, name, minPlayMs = 0, callbacks = {}) {
  return new Promise((resolve) => {
    log(`playToEnd: ${name}`);
    if (!a._animator.hasAnimation(name)) {
      console.warn(`[ctrl] unknown anim: ${name}`);
      return resolve();
    }
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };

    a._animator.showAnimation(name, (_, state) => {
      if (state === 0) {
        callbacks[name]?.();
        finish();
      }
    });

    if (minPlayMs > 0) {
      setTimeout(() => {
        if (!done && a._animator.currentAnimationName === name) a._animator.exitAnimation();
      }, minPlayMs);
    }
  });
}

/** Play a linear anim interruptible by pendingFn() returning true. */
export function playLinear(a, name, pendingFn, callbacks = {}) {
  return new Promise((resolve) => {
    log(`playLinear: ${name}`);
    if (!a._animator.hasAnimation(name)) {
      console.warn(`[ctrl] unknown anim: ${name}`);
      return resolve();
    }
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };

    a._animator.showAnimation(name, (_, state) => {
      if (state === 0) {
        callbacks[name]?.();
        finish();
      }
    });

    const poll = setInterval(() => {
      if (done) {
        clearInterval(poll);
        return;
      }
      if (pendingFn() && a._animator.currentAnimationName === name) {
        clearInterval(poll);
        a._animator.exitAnimation();
      }
    }, 300);
  });
}

/** Loop an anim until pendingFn() returns truthy. Calls decideFn() every tickMs. */
export function playHold(a, name, pendingFn, decideFn, tickMs = 1000) {
  return new Promise((resolve) => {
    log(`playHold: ${name}`);
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };

    a._animator.showAnimation(name, (_, state) => {
      if (state === 0) finish();
      if (state === 1 && pendingFn()) a._animator.exitAnimation();
    });

    const kick = setInterval(() => {
      if (done) {
        clearInterval(kick);
        return;
      }
      if (pendingFn()) {
        clearInterval(kick);
        if (a._animator.currentAnimationName === name) a._animator.exitAnimation();
        else finish();
        return;
      }
      decideFn();
    }, tickMs);
  });
}

/** Loop IdleSnooze until pendingFn() returns truthy. */
export function playSleep(a, pendingFn) {
  return new Promise((resolve) => {
    log('playSleep: IdleSnooze');
    let done = false;

    const playOne = () => {
      if (done) {
        resolve();
        return;
      }
      a._animator.showAnimation('IdleSnooze', (_, state) => {
        if (state === 0) playOne();
      });
    };

    const poll = setInterval(() => {
      if (pendingFn()) {
        clearInterval(poll);
        done = true;
        a._animator.exitAnimation();
      }
    }, 100);

    playOne();
  });
}

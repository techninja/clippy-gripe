/**
 * Session context — accumulated behavioral signals for the current visit.
 * Written by input handler and the controller loop.
 * Read by the controller's _decide() function.
 * @module pages/home/home-session
 */

// Velocity: ring buffer of {t, chars} over a rolling window
const VELOCITY_WINDOW_MS = 10000;
const _velBuf = []; // { t: timestamp, chars: count }

export const session = {
  // Typing
  totalChars: 0,
  totalDeletes: 0,
  burstCount: 0,
  velocityWpm: 0,
  lastInputAt: 0,
  textLength: 0,

  // Personality state (0–1 floats, read by _decide())
  boredom: 0, // grows during uninterrupted idle, drains when Clippy reacts
  tiredness: 0, // grows faster when bored, drains on typing, drives sleep
  irritation: 0, // grows on escalating categories, drains idle, drives storm

  // Interaction counters
  dragCount: 0,
  lastDragAt: 0,
  goatCount: 0,
  wakeCount: 0,
  stormCount: 0,

  sessionStartAt: Date.now(),
};

/** Record a typing event. delta = signed char delta, currentLength = full doc length. */
export function recordInput(delta, currentLength) {
  const now = Date.now();
  session.lastInputAt = now;
  session.textLength = currentLength ?? session.textLength;

  if (delta > 0) {
    session.totalChars += delta;
    if (delta >= 100) session.burstCount++;
    _velBuf.push({ t: now, chars: delta });
    // Typing drains tiredness and boredom — user is actively doing something
    session.tiredness = Math.max(0, session.tiredness - delta * 0.012);
    session.boredom = Math.max(0, session.boredom - delta * 0.015);
  } else if (delta < 0) {
    session.totalDeletes += Math.abs(delta);
    session.tiredness = Math.max(0, session.tiredness - 0.08);
    session.boredom = Math.max(0, session.boredom - 0.05);
  }

  const cutoff = now - VELOCITY_WINDOW_MS;
  while (_velBuf.length && _velBuf[0].t < cutoff) _velBuf.shift();
  const windowChars = _velBuf.reduce((s, e) => s + e.chars, 0);
  session.velocityWpm = Math.round((windowChars / 5) * (60000 / VELOCITY_WINDOW_MS));
}

/** Called by the controller loop after each idle anim completes. */
export function recordIdleAnim(animDurationMs) {
  const secs = animDurationMs / 1000;
  const prevB = session.boredom,
    prevT = session.tiredness;
  session.boredom = Math.min(1, session.boredom + secs * 0.018);
  const tirednessGain = secs * 0.022 * (1 + session.boredom);
  session.tiredness = Math.min(1, session.tiredness + tirednessGain);
  // irritation does NOT drain during idle — only on explicit recordReaction()
  console.log(
    `[session] recordIdleAnim ${secs.toFixed(1)}s: boredom ${prevB.toFixed(3)}→${session.boredom.toFixed(3)} tired ${prevT.toFixed(3)}→${session.tiredness.toFixed(3)}`,
  );
}

/** Called by the controller loop when Clippy does something non-idle (speaks, reacts).
 *  Boredom drains — something interesting happened. Irritation cools slowly. */
export function recordReaction() {
  const prev = session.boredom;
  session.boredom = Math.max(0, session.boredom - 0.3);
  session.irritation = Math.max(0, session.irritation - 0.05);
  console.log(`[session] recordReaction: boredom ${prev.toFixed(3)}→${session.boredom.toFixed(3)}`);
}

/** Adjust irritation by amount (positive = more irritated, negative = cooling). */
export function recordIrritation(amount) {
  const prev = session.irritation;
  session.irritation = Math.min(1, Math.max(0, session.irritation + amount));
  console.log(
    `[session] recordIrritation ${amount > 0 ? '+' : ''}${amount}: ${prev.toFixed(3)}→${session.irritation.toFixed(3)}`,
  );
}

/** Advance tiredness during the pre-appearance hidden warmup (no boredom effect). */
export function recordWarmup(ms) {
  const secs = ms / 1000;
  session.tiredness = Math.min(1, session.tiredness + secs * 0.022);
}

export function recordDrag() {
  session.lastDragAt = Date.now();
}

export function recordWake() {
  session.wakeCount++;
}
export function recordStorm() {
  session.stormCount++;
  session.irritation = 0;
  session.tiredness = 0;
  session.boredom = 0;
}

/** Seconds since last input, or Infinity if never typed. */
export function idleSeconds() {
  if (!session.lastInputAt) return Infinity;
  return (Date.now() - session.lastInputAt) / 1000;
}

/** Seconds since session started. */
export function sessionAge() {
  return (Date.now() - session.sessionStartAt) / 1000;
}

/** Normalized feature vector for behavior classifier. Order must match training. */
export function getFeatures() {
  return {
    boredom: session.boredom,
    tiredness: session.tiredness,
    irritation: session.irritation,
    velocityWpm: Math.min(1, session.velocityWpm / 120),
    deleteRatio:
      session.totalChars > 0 ? Math.min(1, session.totalDeletes / session.totalChars) : 0,
    burstCount: Math.min(1, session.burstCount / 5),
    idleSecs: Math.min(1, idleSeconds() / 300),
    sessionAge: Math.min(1, sessionAge() / 1800),
    goatCount: Math.min(1, session.goatCount / 10),
    wakeCount: Math.min(1, session.wakeCount / 5),
    stormCount: Math.min(1, session.stormCount / 3),
    textLength: Math.min(1, session.textLength / 2000),
  };
}

/**
 * Personality decision function for the Clippy controller loop.
 * Reads session state and returns the next behavior command.
 * Callers own _idleAnimCount/_lastGoatAnim and mutate them after calling decide().
 * @module utils/clippy-decide
 */

import { session, getFeatures } from '#pages/home/home-session.js';
import { classifyBehavior } from './behavior-classify.js';
import {
  BLANK_PAGE_LINES,
  BLANK_PAGE_ASIDE_LINES,
  HAS_TEXT_IDLE_LINES,
  HAS_TEXT_IDLE_ASIDE_LINES,
} from '#pages/home/clippy-lines-loop.js';

export const TIRED_THINK = 0.55;
export const TIRED_GOAD = 0.35;
export const TIRED_SLEEP = 0.85;
export const BORED_THINK = 0.6;
export const GOAD_COOLDOWN_ANIMS = 10;
export const IRRITATION_STORM = 0.72;

export const IDLE_ANIMS_ALERT = [
  { name: 'IdleEyeBrowRaise', minPlayMs: 0 },
  { name: 'IdleFingerTap', minPlayMs: 600 },
];
export const IDLE_ANIMS_BORED = [
  { name: 'IdleRopePile', minPlayMs: 500 },
  { name: 'IdleSideToSide', minPlayMs: 500 },
  { name: 'Idle1_1', minPlayMs: 500 },
  { name: 'Processing', minPlayMs: 800 },
  { name: 'Hearing_1', minPlayMs: 2000 },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const _t0 = Date.now();
const logP = (...a) => console.log('[ctrl:personality]', `+${Date.now() - _t0}ms`, ...a);

export function pickIdleAnim() {
  const pool = Math.random() > session.boredom ? IDLE_ANIMS_ALERT : IDLE_ANIMS_BORED;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Returns true if personality has escalated beyond idle — no side effects. */
export function shouldEscalate() {
  const { tiredness, irritation, boredom } = session;
  return (
    tiredness >= TIRED_SLEEP ||
    irritation >= IRRITATION_STORM ||
    tiredness >= TIRED_THINK ||
    boredom >= BORED_THINK
  );
}

/**
 * Main decision function. Returns a cmd object.
 * Caller must set _lastGoatAnim = idleAnimCount and increment goatCount when type === 'goad'.
 */
export function decide(idleAnimCount, lastGoatAnim) {
  const { tiredness, irritation, boredom, textLength } = session;
  const hasText = textLength > 0;
  const goatCooled = idleAnimCount - lastGoatAnim >= GOAD_COOLDOWN_ANIMS;

  const features = getFeatures();
  const label = classifyBehavior(features);

  logP(
    `_decide: boredom=${boredom.toFixed(3)} tired=${tiredness.toFixed(3)} irritation=${irritation.toFixed(3)} idle#=${idleAnimCount} cooled=${goatCooled} → ${label}`,
  );

  // Hard guards — classifier handles nuance, extremes are deterministic
  if (tiredness >= TIRED_SLEEP) return { type: 'sleep' };
  if (irritation >= IRRITATION_STORM) return { type: 'storm' };
  if (label === 'sleep') return { type: 'sleep' };
  if (label === 'storm') return { type: 'storm' };
  if (label === 'goad' && goatCooled) {
    const lines = hasText ? HAS_TEXT_IDLE_LINES : BLANK_PAGE_LINES;
    const aside = hasText ? HAS_TEXT_IDLE_ASIDE_LINES : BLANK_PAGE_ASIDE_LINES;
    return { type: 'goad', text: pick(lines), aside: pick(aside) };
  }
  if (label === 'think') return { type: 'hold', anim: 'Thinking' };
  return { type: 'idle' };
}

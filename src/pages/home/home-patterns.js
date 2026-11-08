/**
 * Short-text pattern detection and shuffle-queue pick utility.
 * @module pages/home/home-patterns
 */

import {
  GREETING_LINES,
  GREETING_ASIDE_LINES,
  STALLING_LINES,
  STALLING_ASIDE_LINES,
  REPEATED_CHAR_LINES,
  REPEATED_CHAR_ASIDE_LINES,
} from './clippy-lines.js';

const GREETING_RE =
  /^(hi+|hey+|hello|yo+|sup|howdy|hiya|greetings|good\s*(morning|evening|afternoon)|what'?s\s*up)[!?.\s]*$/i;
const STALLING_RE =
  /^(i\s*don'?t\s*know|idk|um+|uh+|er+|hm+|hmm+|so+|ok+|okay|well+|like|just|lol|lmao|haha+|k|kk)[!?.\s]*$/i;
const REPEATED_RE = /^(.)\1{3,}\s*$/;

export function tryShortPattern(text) {
  const t = text.trim();
  if (!t) return null;
  if (REPEATED_RE.test(t)) return [REPEATED_CHAR_LINES, REPEATED_CHAR_ASIDE_LINES, 'IdleSnooze'];
  if (GREETING_RE.test(t)) return [GREETING_LINES, GREETING_ASIDE_LINES, 'Greeting'];
  if (STALLING_RE.test(t)) return [STALLING_LINES, STALLING_ASIDE_LINES, 'IdleHeadScratch'];
  return null;
}

const shuffleQueues = new Map();
export function pickFresh(arr) {
  if (arr.length <= 1) return arr[0];
  let q = shuffleQueues.get(arr);
  if (!q?.length) {
    q = [...arr].sort(() => Math.random() - 0.5);
    shuffleQueues.set(arr, q);
  }
  return q.pop();
}

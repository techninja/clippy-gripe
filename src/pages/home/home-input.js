/**
 * Input handling and Clippy reaction triggers.
 * Classification logic lives in home-classify.js.
 * @module pages/home/home-input
 */

import { initClippy } from '#utils/clippy-agent.js';
import { clippySpeak, clippyAside, cancelPending } from '#utils/clippy-speak.js';
import { recordInput } from './home-session.js';
import {
  EARLY_LINES,
  PASTE_LINES,
  DELETE_ALL_LINES,
  DELETE_MOST_LINES,
  LONG_DOC_LINES,
} from './clippy-lines.js';
import { wakeIfSleeping } from './home-idle.js';
import { send } from '#utils/clippy-controller.js';
import { tryShortPattern } from './home-patterns.js';
import { saveDraft } from './home-draft.js';
import { classify, resetClassifyState, getLastText, setLastText } from './home-classify.js';

const TYPING_DEBOUNCE = 500;
const CLASSIFY_AT = 20;
const APPEAR_AT = 3;
const EARLY_AT = 15;

let debounceTimer = null;
let prevLength = 0;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function onInput(host, e, brain, opts = {}) {
  const text = e.currentTarget.innerText || '';
  const paper = e.currentTarget;
  paper.toggleAttribute('data-nonempty', text.trim().length > 0);
  saveDraft(text);
  cancelPending();
  const len = text.trim().length;
  const delta = len - prevLength;
  recordInput(delta, len);
  const isEnter = e.inputType === 'insertParagraph' || e.key === 'Enter';

  if (len >= APPEAR_AT) initClippy();
  wakeIfSleeping();

  if (len === 0 && prevLength > 0) {
    prevLength = 0;
    resetClassifyState();
    send({ type: 'play', anim: 'Wave', text: pick(DELETE_ALL_LINES) });
    return;
  }

  if (delta >= 100) {
    prevLength = len;
    setLastText(text);
    clearTimeout(debounceTimer);
    initClippy().then(() => {
      clippySpeak(pick(PASTE_LINES));
      send({ type: 'play', anim: 'GetAttention' });
      if (len >= CLASSIFY_AT && host.categories.length)
        debounceTimer = setTimeout(() => classify(host, text, text, brain), TYPING_DEBOUNCE);
    });
    return;
  }

  if (delta <= -80 && prevLength >= 100) {
    prevLength = len;
    resetClassifyState();
    setLastText(text);
    clippySpeak(pick(DELETE_MOST_LINES));
    send({ type: 'play', anim: 'Alert' });
    return;
  }

  prevLength = len;
  clearTimeout(debounceTimer);

  const shortMatch = len > 0 && len < EARLY_AT ? tryShortPattern(text) : null;
  if (shortMatch) {
    const [lines, asideLines, anim] = shortMatch;
    debounceTimer = setTimeout(() => {
      initClippy().then(() => {
        setLastText(text);
        clippySpeak(pick(lines));
        send({ type: 'play', anim });
        clippyAside(pick(asideLines), 4000);
      });
    }, TYPING_DEBOUNCE);
    return;
  }

  if (len > 0 && len < EARLY_AT) return;

  if (len >= 500 && len - getLastText().length >= 200) {
    clippySpeak(pick(LONG_DOC_LINES));
    send({ type: 'play', anim: 'Idle1_1' });
  }

  debounceTimer = setTimeout(
    () => {
      if (!host.categories.length) {
        if (getLastText() === '') {
          clippySpeak(pick(EARLY_LINES));
          send({ type: 'play', anim: 'Thinking' });
          setLastText(text);
        }
        return;
      }
      const lastLine = text.trimEnd().split('\n').at(-2)?.trim() ?? '';
      const newText = text.slice(getLastText().length).trim();
      const classifyWith =
        isEnter && lastLine.length >= CLASSIFY_AT
          ? lastLine
          : newText.length >= CLASSIFY_AT
            ? newText
            : text;
      classify(host, classifyWith, text, brain, opts);
    },
    isEnter ? 0 : TYPING_DEBOUNCE,
  );
}

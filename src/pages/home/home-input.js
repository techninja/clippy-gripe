/**
 * Input handling, classification, and Clippy reaction logic.
 * @module pages/home/home-input
 */

import { classifyText } from '#utils/classify.js';
import { getAgent, initClippy, clippySpeak } from '#utils/clippy-agent.js';
import {
  EARLY_LINES,
  PASTE_LINES,
  DELETE_ALL_LINES,
  DELETE_MOST_LINES,
  LONG_DOC_LINES,
} from './clippy-lines.js';

const TYPING_DEBOUNCE = 900;
const CLASSIFY_AT = 50;
const APPEAR_AT = 3;
const EARLY_AT = 15;
const REFIRE_DELTA = 80;

let debounceTimer = null;
let lastCategory = null;
let lastCategoryAt = 0;
let prevLength = 0;
let lastText = '';

const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];

function showCategory(host, categoryId) {
  const a = getAgent();
  const cat = host.categories.find((c) => c.id === categoryId);
  if (!cat || !a) return;
  const textLen = host.querySelector?.('.paper')?.innerText?.length ?? 0;
  if (categoryId === lastCategory && Math.abs(textLen - lastCategoryAt) < REFIRE_DELTA) return;
  lastCategory = categoryId;
  lastCategoryAt = textLen;
  clippySpeak(cat.clippy_line);
  a.play(cat.animation);
  const aside = cat.suggestions[Math.floor(Math.random() * cat.suggestions.length)];
  setTimeout(() => {
    if (lastCategory === categoryId) clippySpeak(aside);
  }, 4500);
}

function classify(host, text, fullText, brain) {
  const id = brain?.classes.length
    ? classifyText(text, brain)
    : host.categories[Math.floor(Math.random() * host.categories.length)].id;
  lastText = fullText;
  showCategory(host, id);
}

export function onInput(host, e, brain) {
  const text = e.currentTarget.innerText || '';
  const len = text.trim().length;
  const delta = len - prevLength;

  if (len >= APPEAR_AT && !getAgent()) initClippy();

  if (len === 0 && prevLength > 10) {
    prevLength = 0;
    lastCategory = null;
    lastText = '';
    getAgent()?.play('Wave');
    setTimeout(() => clippySpeak(pick(DELETE_ALL_LINES)), 600);
    return;
  }

  if (delta >= 100) {
    prevLength = len;
    lastText = text;
    clearTimeout(debounceTimer);
    clippySpeak(pick(PASTE_LINES));
    getAgent()?.play('GetAttention');
    if (len >= CLASSIFY_AT && host.categories.length)
      debounceTimer = setTimeout(() => classify(host, text, text, brain), TYPING_DEBOUNCE);
    return;
  }

  if (delta <= -80 && prevLength >= 100) {
    prevLength = len;
    lastCategory = null;
    lastText = text;
    clippySpeak(pick(DELETE_MOST_LINES));
    getAgent()?.play('Sad');
    return;
  }

  prevLength = len;
  clearTimeout(debounceTimer);

  if (len >= EARLY_AT && len < CLASSIFY_AT && lastCategory === null) {
    debounceTimer = setTimeout(() => {
      if (lastCategory === null) {
        clippySpeak(pick(EARLY_LINES));
        getAgent()?.play('Thinking');
        lastCategory = '__early__';
        lastText = text;
      }
    }, TYPING_DEBOUNCE);
    return;
  }

  if (len < CLASSIFY_AT || !host.categories.length) return;

  if (len >= 500 && len - lastText.length >= 200) {
    clippySpeak(pick(LONG_DOC_LINES));
    getAgent()?.play('Idle1_1');
  }

  debounceTimer = setTimeout(() => {
    const newText = text.slice(lastText.length).trim();
    classify(host, newText.length >= CLASSIFY_AT ? newText : text, text, brain);
  }, TYPING_DEBOUNCE);
}

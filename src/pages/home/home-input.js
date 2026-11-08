/**
 * Input handling, classification, and Clippy reaction logic.
 * @module pages/home/home-input
 */

import { classifyText } from '#utils/classify.js';
import { getAgent, initClippy } from '#utils/clippy-agent.js';
import { clippySpeak, clippyAside, cancelPending } from '#utils/clippy-speak.js';
import {
  EARLY_LINES,
  PASTE_LINES,
  DELETE_ALL_LINES,
  DELETE_MOST_LINES,
  LONG_DOC_LINES,
} from './clippy-lines.js';
import { startIdleWatch, cancelIdleWatch, wakeIfSleeping } from './home-idle.js';
import { tryShortPattern, pickFresh } from './home-patterns.js';
import { saveDraft } from './home-draft.js';

const TYPING_DEBOUNCE = 900;
const CLASSIFY_AT = 50;
const APPEAR_AT = 3;
const EARLY_AT = 15;
const REFIRE_DELTA = 80;
const ASIDE_REFIRE_DELTA = 30;

const CHATTY_CATEGORIES = new Set([
  'insulting_clippy',
  'talking_to_clippy',
  'testing_clippy',
  'trying_to_break_clippy',
  'keyboard_mashing',
  'existential_crisis',
]);

let debounceTimer = null;
let lastCategory = null;
let lastCategoryAt = 0;
let lastAsideAt = 0;
let prevLength = 0;
let lastText = '';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function showCategory(host, categoryId) {
  const a = getAgent();
  const cat = host.categories.find((c) => c.id === categoryId);
  if (!cat || !a) return;
  const textLen = host.querySelector?.('.paper')?.innerText?.length ?? 0;
  const refireDelta = CHATTY_CATEGORIES.has(categoryId) ? ASIDE_REFIRE_DELTA : REFIRE_DELTA;
  const sameCategory = categoryId === lastCategory;
  const tooSoon = Math.abs(textLen - lastCategoryAt) < refireDelta;
  if (!sameCategory || !tooSoon) {
    lastCategory = categoryId;
    lastCategoryAt = textLen;
    clippySpeak(pickFresh(cat.clippy_lines || [cat.clippy_line]));
    a.play(cat.animation);
  }
  if (Math.abs(textLen - lastAsideAt) >= ASIDE_REFIRE_DELTA) {
    lastAsideAt = textLen;
    clippyAside(pickFresh(cat.suggestions), 4500);
  }
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
  const paper = e.currentTarget;
  paper.toggleAttribute('data-nonempty', text.trim().length > 0);
  saveDraft(text);
  cancelPending();
  const len = text.trim().length;
  const delta = len - prevLength;

  if (len >= APPEAR_AT && !getAgent()) initClippy();
  wakeIfSleeping();
  cancelIdleWatch();

  if (len === 0 && prevLength > 10) {
    prevLength = 0;
    lastCategory = null;
    lastText = '';
    getAgent()?.play('Wave');
    setTimeout(() => clippySpeak(pick(DELETE_ALL_LINES)), 600);
    startIdleWatch(host);
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

  const shortMatch = len > 0 && len < EARLY_AT ? tryShortPattern(text) : null;
  if (shortMatch) {
    const [lines, asideLines, anim] = shortMatch;
    if (lastCategory !== '__short__') {
      lastCategory = '__short__';
      debounceTimer = setTimeout(() => {
        initClippy().then(() => {
          clippySpeak(pick(lines));
          getAgent()?.play(anim);
          clippyAside(pick(asideLines), 4000);
        });
      }, TYPING_DEBOUNCE);
    }
    return;
  }

  if (len < EARLY_AT) return;

  if (len >= 500 && len - lastText.length >= 200) {
    clippySpeak(pick(LONG_DOC_LINES));
    getAgent()?.play('Idle1_1');
  }

  debounceTimer = setTimeout(() => {
    if (!host.categories.length) {
      if (lastCategory === null) {
        clippySpeak(pick(EARLY_LINES));
        getAgent()?.play('Thinking');
        lastCategory = '__early__';
        lastText = text;
      }
      return;
    }
    const newText = text.slice(lastText.length).trim();
    classify(host, newText.length >= CLASSIFY_AT ? newText : text, text, brain);
  }, TYPING_DEBOUNCE);
}

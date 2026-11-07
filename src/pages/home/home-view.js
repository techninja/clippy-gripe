/**
 * Home view — retro Word canvas with judgmental Clippy.
 * @module pages/home
 */

import { define } from 'hybrids';
import { loadBrain, classifyText } from '#utils/classify.js';
import { getAgent, initClippy, clippySpeak } from '#utils/clippy-agent.js';
import { startClock } from '#utils/clock.js';
import { homeTemplate } from './home-template.js';
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
const REFIRE_DELTA = 80; // re-allow same category after this many chars change

window.__clippyLoading = false; // reset on each module eval

/** @type {any} */
let brain = null;
/** @type {ReturnType<typeof setTimeout>|null} */
let debounceTimer = null;
/** @type {string|null} */
let lastCategory = null;
/** @type {number} */
let lastCategoryAt = 0;
/** @type {number} */
let prevLength = 0;
/** @type {boolean} */
let firedLong = false;

/** @param {string[]} lines @returns {string} */
const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];

/**
 * Deliver category line + follow-up aside 4.5s later.
 * @param {any} host @param {string} categoryId @param {boolean} [force]
 */
function showCategory(host, categoryId, force = false) {
  const a = getAgent();
  const cat = host.categories.find((c) => c.id === categoryId);
  if (!cat || !a) return;
  const textLen = host.querySelector?.('.paper')?.innerText?.length ?? 0;
  if (!force && categoryId === lastCategory && Math.abs(textLen - lastCategoryAt) < REFIRE_DELTA)
    return;
  lastCategory = categoryId;
  lastCategoryAt = textLen;
  clippySpeak(cat.clippy_line);
  a.play(cat.animation);
  const aside = cat.suggestions[Math.floor(Math.random() * cat.suggestions.length)];
  setTimeout(() => {
    if (lastCategory === categoryId) clippySpeak(aside);
  }, 4500);
}

/** @param {any} host @param {Event} e */
function onInput(host, e) {
  const text = /** @type {HTMLElement} */ (e.currentTarget).innerText || '';
  const len = text.trim().length;
  const delta = len - prevLength;

  // Appear
  if (len >= APPEAR_AT && !getAgent()) initClippy();

  // Clear everything
  if (len === 0 && prevLength > 10) {
    prevLength = 0;
    lastCategory = null;
    firedLong = false;
    getAgent()?.play('Wave');
    setTimeout(() => clippySpeak(pick(DELETE_ALL_LINES)), 600);
    return;
  }

  // Big paste
  if (delta >= 100) {
    prevLength = len;
    clearTimeout(debounceTimer);
    clippySpeak(pick(PASTE_LINES));
    getAgent()?.play('GetAttention');
    if (len >= CLASSIFY_AT && host.categories.length) {
      debounceTimer = setTimeout(() => classify(host, text), TYPING_DEBOUNCE);
    }
    return;
  }

  // Deleted a lot (50%+ gone, was substantial)
  if (delta <= -80 && prevLength >= 100) {
    prevLength = len;
    lastCategory = null;
    clippySpeak(pick(DELETE_MOST_LINES));
    getAgent()?.play('Sad');
    return;
  }

  prevLength = len;

  clearTimeout(debounceTimer);

  // Early vague reaction
  if (len >= EARLY_AT && len < CLASSIFY_AT && lastCategory === null) {
    debounceTimer = setTimeout(() => {
      if (lastCategory === null) {
        clippySpeak(pick(EARLY_LINES));
        getAgent()?.play('Thinking');
        lastCategory = '__early__';
      }
    }, TYPING_DEBOUNCE);
    return;
  }

  if (len < CLASSIFY_AT || !host.categories.length) return;

  // Long doc milestone
  if (!firedLong && len >= 500) {
    firedLong = true;
    clippySpeak(pick(LONG_DOC_LINES));
    getAgent()?.play('Idle1_1');
  }

  debounceTimer = setTimeout(() => classify(host, text), TYPING_DEBOUNCE);
}

/** @param {any} host @param {string} text */
function classify(host, text) {
  const id = brain?.classes.length
    ? classifyText(text, brain)
    : host.categories[Math.floor(Math.random() * host.categories.length)].id;
  showCategory(host, id);
}

/** @param {any} host */
function onClickClose(host) {
  host.querySelector('.crash-modal')?.removeAttribute('hidden');
  getAgent()?.play('GoodBye');
}

/** @param {any} _host */
function onClickMinimize(_host) {
  clippySpeak('Oh, leaving already? Probably for the best.');
  getAgent()?.play('Sad');
}

/** @param {any} _host */
function onClickHelp(_host) {
  clippySpeak("I'm afraid I can't help with this one. No one can.");
  getAgent()?.play('Alert');
}

/** @param {any} _host */
function onClickSave(_host) {
  clippySpeak('Saving... just kidding. Where would I even put this?');
  getAgent()?.play('Thinking');
}

export default define({
  tag: 'home-view',
  categories: {
    value: [],
    connect(host) {
      fetch('/data/categories.json')
        .then((r) => r.json())
        .then((d) => {
          host.categories = d;
        });
      loadBrain()
        .then((b) => {
          brain = b;
        })
        .catch(() => {});

      return startClock('taskbar-clock');
    },
  },
  render: {
    value: homeTemplate(onInput, onClickMinimize, onClickClose, onClickSave, onClickHelp),
    shadow: false,
  },
});

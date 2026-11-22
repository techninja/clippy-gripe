/**
 * Category classification and Clippy reaction dispatch.
 * Called by home-input after debounce/enter triggers.
 * @module pages/home/home-classify
 */

import { classifyText } from '#utils/classify.js';
import { clippySpeak, clippyAside } from '#utils/clippy-speak.js';
import { send } from '#utils/clippy-controller.js';
import { recordIrritation } from './home-session.js';
import { isIntroCooling } from '#utils/clippy-agent.js';
import { pickFresh } from './home-patterns.js';

const REFIRE_DELTA = 50;
const ASIDE_REFIRE_DELTA = 25;

const CHATTY = new Set([
  'insulting_clippy',
  'talking_to_clippy',
  'testing_clippy',
  'trying_to_break_clippy',
  'keyboard_mashing',
  'existential_crisis',
]);
const ESCALATE = new Set(['insulting_clippy', 'trying_to_break_clippy']);

let lastCategory = null;
let lastCategoryAt = 0;
let lastAsideAt = 0;
let lastText = '';
let _lastReactionAnim = 'GetAttention'; // seed: first reaction avoids repeating intro anim

export function resetClassifyState() {
  lastCategory = null;
  lastCategoryAt = 0;
  lastAsideAt = 0;
  lastText = '';
}

export function getLastText() {
  return lastText;
}
export function setLastText(t) {
  lastText = t;
}

export function showCategory(host, categoryId, opts = {}) {
  const cat = host.categories.find((c) => c.id === categoryId);
  if (!cat) return;
  const textLen = host.querySelector?.('.paper')?.innerText?.length ?? 0;
  const refireDelta = CHATTY.has(categoryId) ? ASIDE_REFIRE_DELTA : REFIRE_DELTA;
  const sameCategory = categoryId === lastCategory;
  const tooSoon = Math.abs(textLen - lastCategoryAt) < refireDelta;

  if (!sameCategory || !tooSoon) {
    lastCategory = categoryId;
    lastCategoryAt = textLen;
    if (ESCALATE.has(categoryId)) recordIrritation(0.3);
    else recordIrritation(-0.05);
    clippySpeak(pickFresh(cat.clippy_lines || [cat.clippy_line]), opts.aside);
    if (!opts.noAnim && !isIntroCooling()) {
      const anim =
        cat.animation === 'GetAttention' && _lastReactionAnim === 'GetAttention'
          ? 'Explain'
          : cat.animation;
      _lastReactionAnim = anim;
      send({ type: 'play', anim });
    }
  }
  if (Math.abs(textLen - lastAsideAt) >= ASIDE_REFIRE_DELTA) {
    lastAsideAt = textLen;
    clippyAside(pickFresh(cat.suggestions), 4500);
  }
}

export function classify(host, text, fullText, brain, opts = {}) {
  const id = brain?.classes.length
    ? classifyText(text, brain)
    : host.categories[Math.floor(Math.random() * host.categories.length)].id;
  lastText = fullText;
  showCategory(host, id, opts);
}

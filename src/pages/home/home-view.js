/**
 * Home view — retro Word canvas with judgmental Clippy.
 * @module pages/home
 */

import { html, define } from 'hybrids';
import { loadBrain, classifyText } from '#utils/classify.js';
import { getAgent, initClippy, clippySpeak } from '#utils/clippy-agent.js';

const TYPING_THRESHOLD = 50;
const TYPING_DEBOUNCE = 900;
const CLIPPY_APPEAR_AT = 3;

window.__clippyLoading = false; // reset on each module eval

/** @type {any} */
let brain = null;
/** @type {ReturnType<typeof setTimeout>|null} */
let debounceTimer = null;
/** @type {string|null} */
let lastCategory = null;

/**
 * Deliver category line + follow-up aside 4.5s later.
 * @param {any} host @param {string} categoryId
 */
function showCategory(host, categoryId) {
  const a = getAgent();
  const cat = host.categories.find((c) => c.id === categoryId);
  if (!cat || categoryId === lastCategory || !a) return;
  lastCategory = categoryId;
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

  if (text.length >= CLIPPY_APPEAR_AT && !getAgent()) initClippy();
  if (text.length < 2 && getAgent()) {
    getAgent().play('Wave');
    lastCategory = null;
  }

  clearTimeout(debounceTimer);
  if (text.length < TYPING_THRESHOLD || !host.categories.length) return;

  debounceTimer = setTimeout(() => {
    const id = brain?.classes.length
      ? classifyText(text, brain)
      : host.categories[Math.floor(Math.random() * host.categories.length)].id;
    showCategory(host, id);
  }, TYPING_DEBOUNCE);
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

      const tick = () => {
        const el = document.getElementById('taskbar-clock');
        if (el)
          el.textContent = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
      };
      tick();
      const t = setInterval(tick, 10000);
      return () => clearInterval(t);
    },
  },
  render: {
    value: () => html`
      <div class="word-workspace">
        <div class="word-window">
          <div class="word-titlebar">
            <div class="word-titlebar-icon"></div>
            <span class="word-titlebar-title">Document1 - Microsoft Word</span>
            <div class="word-titlebar-buttons">
              <div class="word-titlebar-btn" onclick="${onClickMinimize}">_</div>
              <div class="word-titlebar-btn">□</div>
              <div class="word-titlebar-btn" onclick="${onClickClose}">✕</div>
            </div>
          </div>
          <div class="word-menubar">
            <span onclick="${onClickSave}">File</span><span>Edit</span><span>View</span>
            <span>Insert</span><span>Format</span><span>Tools</span><span>Table</span>
            <span>Window</span><span onclick="${onClickHelp}">Help</span>
          </div>
          <div
            class="paper"
            contenteditable="true"
            spellcheck="false"
            data-placeholder="Start typing..."
            oninput="${onInput}"
          ></div>
        </div>
      </div>

      <div class="crash-modal" hidden>
        <div class="crash-box">
          <p>
            WINWORD.EXE has performed an illegal operation because your writing was too bleak and
            will be shut down.
          </p>
          <button onclick="${(h) => h.querySelector('.crash-modal').setAttribute('hidden', '')}">
            OK
          </button>
        </div>
      </div>

      <div class="taskbar">
        <button class="taskbar-start">
          <div class="taskbar-start-logo"></div>
          Start
        </button>
        <div class="taskbar-divider"></div>
        <div class="taskbar-window">
          <div class="taskbar-window-icon"></div>
          Document1 - Microsoft Word
        </div>
        <div class="taskbar-clock" id="taskbar-clock"></div>
      </div>
    `,
    shadow: false,
  },
});

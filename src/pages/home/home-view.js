/**
 * Home view — retro Word canvas with judgmental Clippy.
 * @module pages/home
 */

import { define } from 'hybrids';
import { loadBrain } from '#utils/classify.js';
import { initClippy, introReady, setDragEndHandler } from '#utils/clippy-agent.js';
import { clippySpeak } from '#utils/clippy-speak.js';
import { startClock } from '#utils/clock.js';
import { homeTemplate } from './home-template.js';
import { onInput } from './home-input.js';
import { loadDraft } from './home-draft.js';
import { onDragEnd } from './home-drag.js';
import { send } from '#utils/clippy-controller.js';

const _isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
window.__clippyLoading = false;
window.__clippySleeping = false;
window.__clippyDebugAnim = _isDev;
window.__clippyDebugPersonality = _isDev;

setDragEndHandler(onDragEnd);

let brain = null;

const onClickClose = (host) => {
  host.querySelector('.crash-modal')?.removeAttribute('hidden');
  send({ type: 'play', anim: 'Wave' });
};
const onClickMinimize = () => {
  clippySpeak('Oh, leaving already? Probably for the best.');
  send({ type: 'play', anim: 'Thinking' });
};
const onClickHelp = () => {
  clippySpeak("I'm afraid I can't help with this one. No one can.");
  send({ type: 'play', anim: 'Alert' });
};
const onClickSave = () => {
  clippySpeak('Saving... just kidding. Where would I even put this?');
  send({ type: 'play', anim: 'Thinking' });
};

const onInputBound = (host, e) => onInput(host, e, brain);

export default define({
  tag: 'home-view',
  categories: {
    value: [],
    connect(host) {
      // Restore draft immediately — before any async so re-renders don't wipe it
      const draft = loadDraft();
      if (draft) {
        const paper = host.querySelector('.paper');
        if (paper) {
          paper.innerText = draft;
          paper.setAttribute('data-nonempty', '');
        }
      }

      fetch('/data/categories.json')
        .then((r) => r.json())
        .then((d) => {
          host.categories = d;
          // Re-apply draft after categories re-render
          if (draft) {
            const paper = host.querySelector('.paper');
            if (paper && !paper.getAttribute('data-nonempty')) {
              paper.innerText = draft;
              paper.setAttribute('data-nonempty', '');
            }
          }
          const paper = host.querySelector('.paper');
          initClippy().then(() => {
            if (draft && draft.trim().length >= 3) {
              introReady().then(() => {
                // Classify the draft after the intro reaction has fully played out.
                // Use a long enough delay to clear GetAttention + Explain + balloon read time.
                // noAnim=true skips send(); aside=true on the speak so it won't cancel
                // a balloon that's still being read from the intro reaction.
                setTimeout(() => {
                  onInput(host, { currentTarget: paper }, brain, { noAnim: true, aside: true });
                }, 7000);
              });
            }
          });
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
    value: homeTemplate(onInputBound, onClickMinimize, onClickClose, onClickSave, onClickHelp),
    shadow: false,
  },
});

/**
 * Home view — retro Word canvas with judgmental Clippy.
 * @module pages/home
 */

import { define } from 'hybrids';
import { loadBrain } from '#utils/classify.js';
import { getAgent, clippySpeak } from '#utils/clippy-agent.js';
import { startClock } from '#utils/clock.js';
import { homeTemplate } from './home-template.js';
import { onInput } from './home-input.js';

window.__clippyLoading = false;

let brain = null;

const onClickClose = (host) => {
  host.querySelector('.crash-modal')?.removeAttribute('hidden');
  getAgent()?.play('GoodBye');
};
const onClickMinimize = () => {
  clippySpeak('Oh, leaving already? Probably for the best.');
  getAgent()?.play('Sad');
};
const onClickHelp = () => {
  clippySpeak("I'm afraid I can't help with this one. No one can.");
  getAgent()?.play('Alert');
};
const onClickSave = () => {
  clippySpeak('Saving... just kidding. Where would I even put this?');
  getAgent()?.play('Thinking');
};

const onInputBound = (host, e) => onInput(host, e, brain);

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
    value: homeTemplate(onInputBound, onClickMinimize, onClickClose, onClickSave, onClickHelp),
    shadow: false,
  },
});

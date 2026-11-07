/**
 * Word UI render template — window chrome, paper, taskbar, crash modal.
 * @module pages/home/home-template
 */

import { html } from 'hybrids';

/**
 * @param {Function} onInput
 * @param {Function} onClickMinimize
 * @param {Function} onClickClose
 * @param {Function} onClickSave
 * @param {Function} onClickHelp
 * @returns {Function}
 */
export function homeTemplate(onInput, onClickMinimize, onClickClose, onClickSave, onClickHelp) {
  return () => html`
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
          onpaste="${(h, e) => { e.preventDefault(); const text = e.clipboardData.getData('text/plain'); document.execCommand('insertText', false, text); }}"
        ></div>
      </div>
    </div>

    <div class="crash-modal" hidden>
      <div class="crash-box">
        <p>
          WINWORD.EXE has performed an illegal operation because your writing was too bleak and will
          be shut down.
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
      <div
        class="taskbar-offline"
        title="No network connection — Clippy sees everything. No one else does."
      >
        📵
      </div>
      <div class="taskbar-clock" id="taskbar-clock"></div>
    </div>
  `;
}

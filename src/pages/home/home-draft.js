/**
 * Draft persistence via localStorage.
 * @module pages/home/home-draft
 */

const STORAGE_KEY = 'clippy-doc';

export function saveDraft(text) {
  try {
    localStorage.setItem(STORAGE_KEY, text.trim());
  } catch (_) {
    /* unavailable */
  }
}

export function loadDraft() {
  try {
    const val = localStorage.getItem(STORAGE_KEY)?.trim() || '';
    if (!val) localStorage.removeItem(STORAGE_KEY);
    return val;
  } catch {
    return '';
  }
}

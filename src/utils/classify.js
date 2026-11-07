/**
 * In-browser TF-IDF + Logistic Regression classifier.
 * Loads brain.json once, classifies text in < 1ms.
 * @module utils/classify
 */

/** @typedef {{ classes: string[], vocab: Record<string,number>, idf: number[], coef: number[][], intercept: number[] }} Brain */

/** @type {Brain|null} */
let brain = null;

/** @returns {Promise<Brain>} */
async function loadBrain() {
  if (brain) return brain;
  const res = await fetch('/data/brain.json');
  brain = await res.json();
  return brain;
}

/**
 * Classify text, returning the best matching category id.
 * Falls back to null if brain isn't loaded yet.
 * @param {string} text
 * @param {Brain} b
 * @returns {string}
 */
export function classifyText(text, b) {
  const tokens = text.toLowerCase().match(/\b\w+\b/g) || [];
  /** @type {Record<number,number>} */
  const counts = {};
  for (let i = 0; i < tokens.length; i++) {
    const uni = tokens[i];
    const bi = i < tokens.length - 1 ? `${tokens[i]} ${tokens[i + 1]}` : null;
    if (b.vocab[uni] !== undefined) counts[b.vocab[uni]] = (counts[b.vocab[uni]] || 0) + 1;
    if (bi && b.vocab[bi] !== undefined) counts[b.vocab[bi]] = (counts[b.vocab[bi]] || 0) + 1;
  }

  const scores = b.classes.map((cls, ci) => {
    let score = b.intercept[ci];
    for (const [fi, count] of Object.entries(counts)) {
      const tfidf = (1 + Math.log(count)) * b.idf[fi];
      score += tfidf * b.coef[ci][fi];
    }
    return { id: cls, score };
  });

  // Structural boosts
  const lines = text.split('\n').filter((l) => l.trim());
  const capsRatio =
    text.replace(/[^A-Z]/g, '').length / (text.replace(/[^a-zA-Z]/g, '').length || 1);
  for (const s of scores) {
    if (s.id === 'boring_todo_list' && lines.length >= 3 && text.length / lines.length < 30)
      s.score += 2.5;
    if (s.id === 'angry_manifesto' && capsRatio > 0.35) s.score += 3.0;
  }

  return scores.sort((a, b) => b.score - a.score)[0].id;
}

export { loadBrain };

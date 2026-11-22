/**
 * Behavior classifier — direct dot product inference on normalized feature vectors.
 * Brain loaded once via loadBehaviorBrain(); classifyBehavior() is synchronous.
 * @module utils/behavior-classify
 */

let _brain = null;

export async function loadBehaviorBrain() {
  const res = await fetch('/data/behavior_brain.json');
  _brain = await res.json();
  return _brain;
}

/**
 * Returns the predicted behavior label for the given feature map.
 * Falls back to 'idle' if brain isn't loaded.
 * @param {Record<string,number>} features - from getFeatures()
 * @param {object} [brain] - optional override (defaults to module-level brain)
 * @returns {string}
 */
export function classifyBehavior(features, brain) {
  const b = brain ?? _brain;
  if (!b) return 'idle';
  const f = Object.values(features);
  const scores = b.coef.map((row, i) => row.reduce((s, w, j) => s + w * f[j], b.intercept[i]));
  return b.classes[scores.indexOf(Math.max(...scores))];
}

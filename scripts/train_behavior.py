#!/usr/bin/env python3
"""
Train behavior classifier and export behavior_brain.json.
Input:  behavior_training.jsonl  (from generate_behavior.py)
Output: src/data/behavior_brain.json
"""

import json, numpy as np
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

data = [json.loads(l) for l in open('behavior_training.jsonl')]
X = np.array([d['features'] for d in data])
y = [d['label'] for d in data]

clf = LogisticRegression(max_iter=2000, C=1.0)
scores = cross_val_score(clf, X, y, cv=5)
print(f'CV accuracy: {scores.mean():.3f} ± {scores.std():.3f}')

clf.fit(X, y)

brain = {
    'classes':   clf.classes_.tolist(),
    'coef':      clf.coef_.tolist(),
    'intercept': clf.intercept_.tolist(),
}

out = Path('src/data/behavior_brain.json')
out.parent.mkdir(parents=True, exist_ok=True)
json.dump(brain, out.open('w'))
print(f'Wrote {out} ({out.stat().st_size // 1024}KB, {len(brain["classes"])} classes)')

#!/usr/bin/env python3
"""
Train a TF-IDF + Logistic Regression classifier on training_data.jsonl
and export a static brain.json for the browser classifier.

Usage: python3 train.py
Output: brain.json
"""

import json

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import cross_val_score
except ImportError:
    print("Missing scikit-learn: pip3 install scikit-learn")
    raise SystemExit(1)

IN_FILE = "training_data.jsonl"
OUT_FILE = "brain.json"
MAX_FEATURES = 6000

def load_data():
    texts, labels = [], []
    with open(IN_FILE) as f:
        for line in f:
            row = json.loads(line)
            texts.append(row["text"])
            labels.append(row["label"])
    return texts, labels

def main():
    print(f"Loading {IN_FILE}...")
    texts, labels = load_data()
    print(f"  {len(texts)} examples, {len(set(labels))} categories")

    vec = TfidfVectorizer(ngram_range=(1, 2), max_features=MAX_FEATURES, sublinear_tf=True)
    X = vec.fit_transform(texts)

    clf = LogisticRegression(C=2.0, max_iter=500)
    clf.fit(X, labels)

    scores = cross_val_score(clf, X, labels, cv=5)
    print(f"  CV accuracy: {scores.mean():.3f} ± {scores.std():.3f}")

    brain = {
        "classes": clf.classes_.tolist(),
        "vocab": {k: int(v) for k, v in vec.vocabulary_.items()},
        "idf": [round(x, 4) for x in vec.idf_.tolist()],
        "coef": [[round(w, 4) for w in row] for row in clf.coef_.tolist()],
        "intercept": [round(b, 4) for b in clf.intercept_.tolist()],
    }

    with open(OUT_FILE, "w") as f:
        json.dump(brain, f, separators=(",", ":"))

    size_kb = len(json.dumps(brain, separators=(",", ":")).encode()) / 1024
    print(f"  Wrote {OUT_FILE} ({size_kb:.0f} KB, {len(brain['vocab'])} features)")

if __name__ == "__main__":
    main()

# Behavior Classifier — Design & Remaining Work

## Current State

The personality loop is stable and shipping. `_decide()` in `clippy-controller.js`
reads three floats (`boredom`, `tiredness`, `irritation`) and returns a behavior label.
This is the behavior classifier — it's just hardcoded thresholds rather than a trained model.

What's working:

- Idle → Thinking → goad → sleep cascade driven by `tiredness`/`boredom` accumulation
- Storm triggered by `irritation` from escalating input categories
- Goad cooldown (10 anims), post-goad drain, forced idle cycle to prevent think re-entry
- Sleep/wake cycle with personality reset on wake
- All personality state in `home-session.js`, all decisions in `_decide()`

---

## What the Classifier Replaces

The hardcoded thresholds in `_decide()`:

```js
if (tiredness >= TIRED_SLEEP) return { type: 'sleep' };
if (irritation >= IRRITATION_STORM) return { type: 'storm' };
if (tiredness >= TIRED_GOAD && goatCooled) return { type: 'goad', ... };
if (tiredness >= TIRED_THINK || boredom >= BORED_THINK) return { type: 'hold', anim: 'Thinking' };
return { type: 'idle' };
```

A trained classifier replaces this with a model that weighs more signals — not just
the three personality floats, but typing velocity, session age, delete ratio, interaction
history — and produces the same behavior labels with better calibration.

The loop structure doesn't change. `_decide()` becomes a thin wrapper around inference.

---

## Behavior Labels (6 classes)

| Label | Maps to |
|---|---|
| `idle` | Rest pause + random idle anim |
| `think` | `{ type: 'hold', anim: 'Thinking' }` |
| `goad` | `{ type: 'goad', text, aside }` — speak + idle anim + drain |
| `sleep` | `{ type: 'sleep' }` |
| `storm` | `{ type: 'storm' }` |
| `wake` | `{ type: 'play', anim: 'GetAttention', text, aside }` — only from sleep |

`wake` is currently handled by `home-idle.js` outside `_decide()`. Keep it there —
the classifier only covers the autonomous loop, not input-triggered reactions.

---

## Input Features

All available now in `home-session.js`. Need a `getFeatures()` export:

```js
export function getFeatures() {
  return {
    // Personality floats (already drive _decide)
    boredom:      session.boredom,
    tiredness:    session.tiredness,
    irritation:   session.irritation,

    // Typing behavior
    velocityWpm:  Math.min(1, session.velocityWpm / 120),   // normalized
    deleteRatio:  session.totalChars > 0
                    ? Math.min(1, session.totalDeletes / session.totalChars)
                    : 0,
    burstCount:   Math.min(1, session.burstCount / 5),

    // Time signals
    idleSecs:     Math.min(1, idleSeconds() / 300),         // cap at 5 min
    sessionAge:   Math.min(1, sessionAge() / 1800),         // cap at 30 min

    // Interaction history
    goatCount:    Math.min(1, session.goatCount / 10),
    wakeCount:    Math.min(1, session.wakeCount / 5),
    stormCount:   Math.min(1, session.stormCount / 3),
    textLength:   Math.min(1, session.textLength / 2000),
  };
}
```

---

## Training Pipeline

### 1. Generate training data (`scripts/generate_behavior.py`)

Unlike the category classifier (text → label), this is numeric features → label.
No LLM needed — generate synthetic feature vectors with known labels:

```python
# Example: sleep scenario
# Long idle, high tiredness, low velocity, no recent interaction
{"features": [0.1, 0.9, 0.1, 0.0, 0.1, 0.0, 0.8, 0.3, 0.2, 0.0, 0.0, 0.2], "label": "sleep"}

# Example: goad scenario
# Medium idle, tiredness above goad threshold, cooled down
{"features": [0.3, 0.5, 0.1, 0.0, 0.05, 0.0, 0.3, 0.2, 0.3, 0.0, 0.0, 0.4], "label": "goad"}
```

~100–200 examples per label, ~800 total. Can be generated programmatically from
threshold rules + noise, no LLM required.

### 2. Train (`scripts/train_behavior.py`)

Numeric LogReg directly on feature vectors — no TF-IDF needed:

```python
from sklearn.linear_model import LogisticRegression
import json, numpy as np

data = [json.loads(l) for l in open('behavior_training.jsonl')]
X = np.array([d['features'] for d in data])
y = [d['label'] for d in data]

clf = LogisticRegression(max_iter=1000).fit(X, y)

# Export: classes + coef + intercept (same shape as brain.json)
brain = {
  'classes': clf.classes_.tolist(),
  'coef': clf.coef_.tolist(),
  'intercept': clf.intercept_.tolist(),
}
json.dump(brain, open('behavior_brain.json', 'w'))
```

### 3. Inference (`src/utils/behavior-classify.js`)

No TF-IDF — direct dot product:

```js
export function classifyBehavior(features, brain) {
  if (!brain) return 'idle';
  const f = Object.values(features);  // must match training feature order
  const scores = brain.coef.map((row, i) =>
    row.reduce((s, w, j) => s + w * f[j], brain.intercept[i])
  );
  return brain.classes[scores.indexOf(Math.max(...scores))];
}
```

Inference is ~0.1ms. No async, no fetch at decision time.

---

## Integration

### `src/utils/clippy-controller.js`

Replace the body of `_decide()`:

```js
import { classifyBehavior } from './behavior-classify.js';
import { getFeatures } from '../pages/home/home-session.js';

function _decide() {
  const features = getFeatures();
  const label = classifyBehavior(features, _behaviorBrain);
  // ... map label to cmd, same log output
}
```

`_behaviorBrain` loaded at startup, passed in or stored as module-level var.

### `src/pages/home/home-view.js`

Load alongside category brain:

```js
import { loadBehaviorBrain } from '#utils/behavior-classify.js';
loadBehaviorBrain().catch(() => {});  // graceful fallback to 'idle'
```

### `src/pages/home/home-session.js`

Add `getFeatures()` export (see above).

---

## Files to Create

| File | Purpose |
|---|---|
| `scripts/generate_behavior.py` | Generate labeled feature vectors |
| `scripts/train_behavior.py` | Train LogReg, export `behavior_brain.json` |
| `src/data/behavior_brain.json` | Trained model (~10KB) |
| `src/utils/behavior-classify.js` | `classifyBehavior(features, brain) → label` |

## Files to Modify

| File | Change |
|---|---|
| `src/utils/clippy-controller.js` | Replace `_decide()` body with classifier call |
| `src/pages/home/home-session.js` | Add `getFeatures()` export |
| `src/pages/home/home-view.js` | Load behavior brain at startup |

---

## Key Invariants to Preserve

1. `_pending` always takes priority — classifier is the fallback only
2. `send()` from input reactions always wins over classifier suggestions
3. `_decide()` is called synchronously — no async in the loop
4. `goatCount++` and `_lastGoatAnim` side effects must still happen inside `_decide()` (or its replacement) — never speculatively
5. Post-goad drain (`tiredness -= 0.15`, `boredom -= 0.10`) and forced idle cycle must be preserved regardless of whether the goad came from the classifier or hardcoded thresholds

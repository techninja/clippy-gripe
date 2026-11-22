#!/usr/bin/env python3
"""
Generate synthetic labeled feature vectors for the behavior classifier.
Feature order (12): boredom, tiredness, irritation, velocityWpm, deleteRatio,
                    burstCount, idleSecs, sessionAge, goatCount, wakeCount,
                    stormCount, textLength
Outputs: behavior_training.jsonl (~800 examples, ~150 per label)
"""

import json, random, math

rng = random.Random(42)

def r(lo, hi): return rng.uniform(lo, hi)
def noise(v, amt=0.08): return max(0.0, min(1.0, v + rng.uniform(-amt, amt)))

LABELS = ['idle', 'think', 'goad', 'sleep', 'storm']
OUT = 'behavior_training.jsonl'
PER_LABEL = 160

def make(boredom, tiredness, irritation, velocityWpm, deleteRatio,
         burstCount, idleSecs, sessionAge, goatCount, wakeCount,
         stormCount, textLength, jitter=True):
    f = [boredom, tiredness, irritation, velocityWpm, deleteRatio,
         burstCount, idleSecs, sessionAge, goatCount, wakeCount,
         stormCount, textLength]
    if jitter:
        f = [noise(v) for v in f]
    return [round(max(0.0, min(1.0, v)), 4) for v in f]

examples = []

for _ in range(PER_LABEL):
    # idle: low tiredness, low boredom, low irritation
    examples.append({'features': make(r(0,0.35), r(0,0.30), r(0,0.25),
                                      r(0,0.6), r(0,0.3), r(0,0.4),
                                      r(0,0.3), r(0,0.8), r(0,0.3),
                                      r(0,0.4), r(0,0.3), r(0,0.8)),
                     'label': 'idle'})

for _ in range(PER_LABEL):
    # think: tiredness or boredom above think threshold (~0.55/0.60), not yet goad/sleep
    tired = r(0.55, 0.80)
    bored = r(0.60, 0.90) if tired < 0.55 else r(0.2, 0.9)
    examples.append({'features': make(bored, tired, r(0,0.50),
                                      r(0,0.4), r(0,0.3), r(0,0.3),
                                      r(0.1,0.6), r(0,0.9), r(0,0.5),
                                      r(0,0.4), r(0,0.3), r(0,0.9)),
                     'label': 'think'})

for _ in range(PER_LABEL):
    # goad: tiredness >= 0.35, cooled (goatCount low relative to session), not sleep/storm
    examples.append({'features': make(r(0.2,0.7), r(0.35,0.80), r(0,0.50),
                                      r(0,0.3), r(0,0.4), r(0,0.3),
                                      r(0.1,0.7), r(0.1,0.9), r(0,0.4),
                                      r(0,0.4), r(0,0.2), r(0,0.9)),
                     'label': 'goad'})

for _ in range(PER_LABEL):
    # sleep: high tiredness (>= 0.85), long idle, low velocity
    examples.append({'features': make(r(0.4,1.0), r(0.85,1.0), r(0,0.40),
                                      r(0,0.1), r(0,0.2), r(0,0.2),
                                      r(0.4,1.0), r(0.1,1.0), r(0.1,0.8),
                                      r(0,0.6), r(0,0.4), r(0,0.9)),
                     'label': 'sleep'})

for _ in range(PER_LABEL):
    # storm: high irritation (>= 0.72), recent typing activity
    examples.append({'features': make(r(0.2,0.8), r(0,0.70), r(0.72,1.0),
                                      r(0.1,0.8), r(0.1,0.6), r(0,0.6),
                                      r(0,0.3), r(0.1,0.9), r(0,0.5),
                                      r(0,0.4), r(0,0.5), r(0.1,1.0)),
                     'label': 'storm'})

rng.shuffle(examples)
with open(OUT, 'w') as f:
    for ex in examples:
        f.write(json.dumps(ex) + '\n')

print(f'Wrote {len(examples)} examples to {OUT}')
for label in LABELS:
    n = sum(1 for e in examples if e['label'] == label)
    print(f'  {label}: {n}')

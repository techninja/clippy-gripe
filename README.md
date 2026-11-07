# clippy-gripe

> It looks like you're reading a README. Would you like help with that?

A single-page static site that watches you type and judges you for it. Powered by a tiny in-browser text classifier and an animated Clippy who has made his peace with being hated.

**[clippy.gripe](https://clippy.gripe)**

## What it does

You open a blank Word 97 document. You start typing. Clippy appears. Once you've written enough for him to form an opinion (~50 characters), he delivers an oddly specific, passive-aggressive observation about what you're writing — then mutters a sardonic follow-up a few seconds later, unprompted.

The classifier knows 50 categories of human writing, from *"It looks like you're penning an unhinged manifesto about someone who wronged you"* to *"It looks like you're doing therapy homework at the last possible minute."* It also knows when you're trying to talk to Clippy directly, insult him, or break the app. He has responses for all of these. He doesn't care.

## Quick Start

```bash
npm install
npm run dev       # dev server at localhost:3000
npm run watch     # spec compliance dashboard + dev server
```

## How the brain works

The classifier runs entirely in the browser — no API calls, no server. It's a TF-IDF + Logistic Regression model trained offline on ~4000 LLM-generated text examples and exported as a static `brain.json` (~3MB). Inference takes under 1ms.

To retrain with new categories:

```bash
# on a machine with Ollama + a capable GPU
python3 scripts/generate.py --resume   # generates training_data.jsonl
python3 scripts/train.py               # exports brain.json
cp brain.json src/data/brain.json
```

See `docs/app-spec/CLIPPY_HELP.md` for the full pipeline.

## Stack

- [Clearstack](https://github.com/techninja/clearstack) — no-build web component framework
- [clippyjs](https://github.com/pi0/clippyjs) — Clippy animations and speech bubbles
- [scikit-learn](https://scikit-learn.org) — offline training only, not shipped to browser
- [Ollama](https://ollama.ai) + qwen3:14b — offline dataset generation, not shipped to browser

## Deployment

Point any static host at `src/`. No build step required.

## License

MIT

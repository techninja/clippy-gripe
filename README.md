# clippy-gripe

> It looks like you're reading a README. Would you like help with that?

A single-page static site that watches you type and judges you for it. Powered by a tiny in-browser text classifier and an animated Clippy who has made his peace with being hated.

**[clippy.gripe](https://clippy.gripe)**

## What it does

You open a blank Word 97 document. You start typing. Clippy appears almost immediately and starts forming opinions. Once you've written enough for him to commit (~50 characters), he delivers an oddly specific, passive-aggressive observation about what you're writing — then mutters a sardonic follow-up a few seconds later, unprompted.

He also reacts when you paste a wall of text, delete everything in a fit of regret, or just hold down a key until something breaks inside you.

## Things to try

Some categories are easy to hit. Others require commitment.

| Try typing... | What Clippy thinks |
|---|---|
| A grocery list | *"...with the energy of someone who has given up"* |
| An apology that's mostly their fault | *"...that's mostly the other person's fault"* |
| Something to Clippy directly | *"That's... not how this works"* |
| Insults aimed at Clippy | *"I've been called worse. By better people."* |
| `asdfkjhasdkfjh` | *"...expressing something that transcends language"* |
| A breakup text | *"...you've rewritten 11 times"* |
| A LinkedIn post | *"...disguised as humility"* |
| A resignation letter | *"...with the energy of someone burning a bridge"* |
| Conspiracy theory bullet points | *"...connecting dots that were never meant to be connected"* |
| Paste a huge block of text | *"You didn't write that just now, did you."* |
| Delete everything | *"Gone. All of it. I respect that."* |
| Ask Clippy for help | *"From a text box. On the internet."* |

There are 50 categories total. Some are harder to reach than others. He knows about therapy homework, revenge plans, fake sick notes, existential crises, and terms & conditions that no one will read.

## How the brain works

The classifier runs entirely in the browser — no API calls, no server. It's a TF-IDF + Logistic Regression model trained offline on ~3500 LLM-generated text examples across 50 categories, exported as a static `brain.json` (~2.4MB). Inference takes under 1ms.

To retrain with new categories:

```bash
# on a machine with Ollama + a capable GPU
python3 scripts/generate.py --resume   # generates training_data.jsonl
python3 scripts/train.py               # exports brain.json
cp brain.json src/data/brain.json
```

## Quick Start

```bash
npm install
npm run dev       # dev server at localhost:3000
npm run watch     # spec compliance dashboard + dev server
```

## Stack

- [Clearstack](https://github.com/techninja/clearstack) — no-build web component framework
- [clippyjs](https://github.com/pi0/clippyjs) — Clippy animations and speech bubbles
- [scikit-learn](https://scikit-learn.org) — offline training only, not shipped to browser
- [Ollama](https://ollama.ai) + qwen3:14b — offline dataset generation, not shipped to browser

## Deployment

Point any static host at `src/`. No build step required.

## License

MIT

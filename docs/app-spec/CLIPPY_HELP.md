# clippy-help App Spec

A single-page static site that renders a retro Word 97 document editor and judges whatever you type using an in-browser text classifier, delivered by an animated Clippy.

## Concept

The user opens a blank Word document. As soon as they start typing, Clippy appears and watches. Once enough text exists to classify (~50 characters), Clippy delivers an oddly specific, passive-aggressive observation about what they're writing — then mutters a sardonic follow-up ~4 seconds later. Clicking the title bar buttons and menu items triggers additional Clippy reactions. Nothing is saved. Nothing is useful. That's the point.

## Architecture

100% static. No server calls at runtime. Deployable to any CDN (GitHub Pages, Cloudflare Pages, Netlify).

```
src/
  index.html              # App shell — Win98 FOUC color, single stylesheet
  data/
    categories.json       # 50 Clippy categories with lines, animations, asides
    brain.json            # Trained TF-IDF classifier weights (~3MB)
  pages/home/
    home-view.js          # Single hybrids component — all UI and Clippy logic
  utils/
    classify.js           # In-browser TF-IDF + LogReg inference (~30 lines)
  styles/
    word.css              # All styles — Win98 desktop, Word chrome, paper, taskbar
scripts/
  generate.py             # Offline: generates training_data.jsonl via Ollama
  train.py                # Offline: trains classifier, exports brain.json
```

## Classifier Pipeline

The brain is trained offline and shipped as a static JSON file. No ML runs in the browser at inference time — just arithmetic.

### 1. Dataset Generation (`scripts/generate.py`)

- Hits a local Ollama instance (qwen3:14b) via HTTP
- Generates 80 varied text examples per category
- Output: `training_data.jsonl` — one `{"text": "...", "label": "id"}` per line
- Supports `--resume` to add new categories without regenerating existing ones
- Run on a machine with a capable GPU (hydra: 3x GTX 1070 Ti)

### 2. Training (`scripts/train.py`)

```bash
cd ~/clippy
python3 -m venv venv
venv/bin/pip install scikit-learn
venv/bin/python3 train.py
```

- TF-IDF vectorizer: 1-2 word ngrams, 6000 features, sublinear TF
- Logistic Regression: C=2.0, max_iter=500
- Exports `brain.json` with vocab, IDF weights, coefficients, intercepts
- Float values rounded to 4 decimal places to reduce file size ~60%
- Vocab integer values cast to native Python int (numpy int64 not JSON-serializable)
- CV accuracy on 50-category dataset: ~91%

### 3. Deploying a new brain

```bash
scp hydra:~/clippy/brain.json src/data/brain.json
```

The frontend loads it once on connect and caches it in the module scope. The stub random classifier is active until brain.json loads — no errors, no flash.

### 4. In-browser inference (`src/utils/classify.js`)

Pure JS implementation of TF-IDF dot product + logistic regression scoring:

1. Tokenize input text into unigrams and bigrams
2. Count token frequencies, look up vocab indices
3. Compute TF-IDF weighted dot product against each class coefficient vector
4. Add structural heuristic boosts (CAPS ratio → angry_manifesto, line density → boring_todo_list)
5. Return the class with the highest score

Runs in under 1ms on any device.

## Category Schema (`src/data/categories.json`)

```json
{
  "id": "string",           // classifier label, snake_case
  "clippy_line": "string",  // main observation Clippy speaks
  "animation": "string",    // clippyjs animation name
  "suggestions": ["string"] // 3 sardonic follow-up asides (one picked randomly)
}
```

### Animation values

Valid clippyjs animation names used: `Alert`, `Congratulate`, `Thinking`, `Writing`, `GetAttention`, `Idle`, `Sad`.

### Category groups

**Writing types (30):** angry_manifesto, corporate_bootlicking, boring_todo_list, breakup_text, passive_aggressive_email, apology_not_apology, desperate_ex_text, grocery_list, cover_letter, conspiracy_theory, passive_journal, fake_sick_note, wedding_speech, terms_and_conditions, roommate_note, linkedin_humblebrag, complaint_letter, self_help_notes, meeting_notes, creative_writing, revenge_plan, resignation_letter, birthday_message, technical_documentation, diet_plan, argument_prep, spam_email, therapy_homework, vague_threat, oversharing_bio

**Meta / user interaction (20):** talking_to_clippy, insulting_clippy, testing_clippy, keyboard_mashing, typing_gibberish, meta_commentary, clippy_self_aware, asking_for_help, existential_crisis, love_letter, song_lyrics, excuses, instructions, social_media_post, prayer_or_wish, speech_or_presentation, trying_to_break_clippy, writing_about_writing, farewell_message, rant

## Clippy Interaction Model

### Timing

- **3 chars:** Clippy appears, plays GetAttention
- **50 chars + 900ms debounce:** classifier fires, Clippy speaks main line + plays animation
- **+4.5s:** Clippy mutters a follow-up aside unprompted
- **New category detected:** interrupts previous, resets timer

### Agent lifecycle

Clippy is loaded once from unpkg CDN and stored on `window.__clippyAgent`. The module-level `getAgent()` getter always reads from window, surviving hot reloads without spawning duplicate agents. `window.__clippyLoading` guards against concurrent init calls.

### Easter eggs

- **Title bar ✕:** crash modal ("WINWORD.EXE has performed an illegal operation...")
- **Title bar _:** Clippy says "Oh, leaving already? Probably for the best."
- **File menu:** Clippy says "Saving... just kidding. Where would I even put this?"
- **Help menu:** Clippy says "I'm afraid I can't help with this one. No one can."

## Clearstack Patches

Two patches were made to `@techninja/clearstack` during this project and should be published:

### 1. `lib/package-gen.js` — add `watch` and `docs` scripts

Scaffolded projects were missing `npm run watch` (the blessed TUI dashboard) and `npm run docs`.

### 2. `templates/shared/scripts/spec.js` — route `watch` and `docs` subcommands

The spec script passed `check watch` as a scope string to `check()` which rejected it as unknown. Fixed by detecting `watch` and `docs` as special cases that route to `startWatch()` and `docs()` respectively.

## Deployment

Point any static host at `src/`. No build step.

```bash
# Cloudflare Pages / Netlify: publish directory = src
# GitHub Pages: serve from /src or copy contents to root
```

`brain.json` at ~3MB is the largest asset. It loads once and is not re-fetched. On slow connections the stub random classifier runs until it arrives — Clippy still appears and reacts, just with random categories.

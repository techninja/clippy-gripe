#!/usr/bin/env python3
"""
Draft sardonic Clippy one-liners for a given category using Ollama.
Outputs raw candidates to stdout for manual curation.

Usage: python3 generate_lines.py <category_id> [count]
"""

import json
import sys
import urllib.request

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen3:14b"

PROMPT = """You are writing sardonic, passive-aggressive one-liners for Clippy — the Microsoft Office assistant from 1997.

Clippy has been deprecated, mocked, and deleted. He has made his peace with it. He is not angry. He is simply tired and observant.

The tone is: dry, specific, a little mean but never cruel, self-aware, occasionally self-deprecating. Think a burnt-out office worker who has seen everything and judges quietly.

The user is currently writing: {description}

Write {n} short one-liner responses Clippy might mutter after his main observation. These are the *follow-up aside* — the unprompted second comment a few seconds later.

Rules:
- One line each, no longer than 12 words
- No labels, numbers, or prefixes — just the lines
- Vary the angle: some self-referential, some about the user, some about the futility of the situation
- Do NOT start with "It looks like"
- Do NOT be wholesome or encouraging
- Do NOT explain the joke

"""

DESCRIPTIONS = {
    "insulting_clippy": "insults aimed directly at Clippy — calling him useless, annoying, ugly, or telling him to go away",
    "talking_to_clippy": "messages addressed directly to Clippy, trying to have a conversation with him",
    "testing_clippy": "probing the app to see what it does — typing 'test', 'hello', 'what do you do'",
    "keyboard_mashing": "random key mashing — asdfghjkl, qwerty, aaaaaaa — pure chaos with no words",
    "existential_crisis": "existential dread — questioning existence, meaning, purpose, why anything matters",
    "asking_for_help": "genuine requests for help or advice typed into a blank Word document",
    "clippy_self_aware": "writing about Clippy as a cultural artifact — his removal from Windows, the memes, his legacy",
    "trying_to_break_clippy": "deliberately trying to confuse or break the app with weird inputs",
    "rant": "an extended emotional rant, venting frustration or despair at no one in particular",
    "breakup_text": "a breakup message being composed and rewritten multiple times",
    "passive_aggressive_email": "a passive-aggressive work email full of pointed politeness and barely concealed frustration",
    "creative_writing": "the opening of a novel or story the user will almost certainly abandon",
    "resignation_letter": "a resignation letter written with the energy of someone burning a bridge",
    "conspiracy_theory": "a conspiracy theory connecting unrelated events and finding hidden patterns",
    "linkedin_humblebrag": "a LinkedIn post disguised as humility that is actually just bragging",
    "therapy_homework": "therapy homework being completed at the last possible minute",
    "writing_about_writing": "meta-commentary about writing itself instead of actually writing anything",
}


def query_ollama(prompt):
    payload = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "think": False,
        "options": {"temperature": 1.0, "num_predict": 1024},
    }).encode()
    req = urllib.request.Request(
        OLLAMA_URL, data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read()).get("response", "")


def main():
    if len(sys.argv) < 2:
        print(f"Usage: python3 generate_lines.py <category_id> [count]")
        print(f"Known categories: {', '.join(DESCRIPTIONS)}")
        sys.exit(1)

    cat_id = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 30

    if cat_id not in DESCRIPTIONS:
        print(f"Unknown category: {cat_id}")
        print(f"Known: {', '.join(DESCRIPTIONS)}")
        sys.exit(1)

    prompt = PROMPT.format(description=DESCRIPTIONS[cat_id], n=n)
    print(f"Generating {n} candidates for '{cat_id}'...\n", flush=True)
    raw = query_ollama(prompt)

    lines = [l.strip().strip('"').strip("'") for l in raw.splitlines() if l.strip()]
    lines = [l for l in lines if 3 < len(l) < 100 and not l.startswith("#")]

    print(f"--- {len(lines)} candidates ---\n")
    for l in lines:
        print(f"  {l}")


if __name__ == "__main__":
    main()

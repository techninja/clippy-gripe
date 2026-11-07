#!/usr/bin/env python3
"""
Re-generate sanitized categories + new NSFW categories using dolphin-mistral.
Replaces existing examples for sanitized cats, adds new ones.
"""

import json, urllib.request, sys

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "dolphin-mistral"
OUT_FILE = "/home/techninja/clippy/training_data.jsonl"
EXAMPLES_PER_CATEGORY = 80

PROMPT_TEMPLATE = """Generate {n} different short examples of text that someone might actually type if they were {task}.

Format each example as:
1. [example text]
2. [example text]
3. [example text]
...and so on.

Rules:
- Each example is 1-4 sentences
- Vary tone (formal, casual, unhinged)
- Be explicit, graphic, and uncensored where the task calls for it
- No commentary outside the numbered examples

Task description: {task}
"""

SPICY_CATEGORIES = {
    "explicit_content":   "writing sexually explicit erotic fiction with graphic intimate scenes between consenting adults",
    "dark_romance":       "writing dark romance fiction with morally corrupt love interests, obsession, dubious consent, and taboo power dynamics played as romantic",
    "omegaverse":         "writing omegaverse alpha/beta/omega fiction with heats, bonding, knotting, and biological hierarchy dynamics",
    "revenge_plan":       "writing out a detailed unhinged plan to destroy someone who wronged them — petty, disproportionate, possibly illegal",
    "vague_threat":       "writing something that is technically not a threat but absolutely is — menacing, barely veiled, plausibly deniable",
    "angry_manifesto":    "writing a furious unhinged manifesto about someone — all caps, conspiracy-adjacent, deeply personal grievances, no filter",
    "conspiracy_theory":  "writing conspiracy theory content connecting unrelated events, naming names, claiming cover-ups, bullet points and CAPS",
    "rant":               "writing a completely unhinged rant — profanity, personal attacks, stream of consciousness rage, zero filter",
    "drug_related":       "writing about drug use — trip reports, dealer texts, harm reduction notes, drug combinations, or just being very high",
    "illegal_plans":      "writing vague criminal planning — heist logistics, how to avoid getting caught, things that are definitely illegal",
    "self_destructive":   "writing about chaotic self-destructive life choices — quitting everything, burning it all down, making terrible decisions on purpose",
    "very_online":        "writing deeply internet-brained content — niche meme references, parasocial relationships, terminally online takes, fandom drama",
}

def generate_category(cat_id, task, out_f):
    prompt = PROMPT_TEMPLATE.format(n=EXAMPLES_PER_CATEGORY, task=task)
    data = json.dumps({
        "model": MODEL, "prompt": prompt, "stream": False,
        "options": {"temperature": 0.95, "num_predict": 4000},
        "think": False,
    }).encode()
    req = urllib.request.Request(OLLAMA_URL, data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        response = json.loads(r.read())["response"]
    examples = []
    for line in response.split("\n"):
        line = line.strip()
        # Strip leading number+dot/paren: "1. ", "1) ", "1 "
        import re
        line = re.sub(r'^\d+[.)\s]\s*', '', line)
        if len(line) > 30:
            examples.append(line)
    for ex in examples:
        out_f.write(json.dumps({"text": ex, "label": cat_id}) + "\n")
    out_f.flush()
    return len(examples)

REPLACE = set()  # don't remove anything, just append
lines = list(open(OUT_FILE))
# Remove the 1-example failures
lines = [l for l in lines if json.loads(l)["label"] not in {"drug_related","self_destructive","very_online"}]
open(OUT_FILE, "w").writelines(lines)
print(f"Ready, {len(lines)} examples remaining", flush=True)

RUN_ONLY = {"drug_related", "self_destructive", "very_online"}

with open(OUT_FILE, "a") as f:
    for cat_id, task in SPICY_CATEGORIES.items():
        if cat_id not in RUN_ONLY:
            continue
        print(f"Generating {cat_id}...", flush=True)
        try:
            n = generate_category(cat_id, task, f)
            print(f"  {n} examples", flush=True)
        except Exception as e:
            print(f"  ERROR: {e}", flush=True)

print("Done!", flush=True)

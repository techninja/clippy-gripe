#!/usr/bin/env python3
"""
Generate training data for the Clippy classifier.
Hits Ollama (qwen3:14b) to produce 80 varied text examples per category.
Output: training_data.jsonl — one {"text": "...", "label": "id"} per line.

Usage: python3 generate.py [--resume]
"""

import json
import urllib.request
import urllib.error
import sys
import os
import time

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen3:14b"
EXAMPLES_PER_CATEGORY = 80
OUT_FILE = "training_data.jsonl"
CATEGORIES_FILE = "../src/data/categories.json"

PROMPT_TEMPLATE = """Generate {n} different examples of text that someone might actually type if they were {task}.

Rules:
- Vary length from 1 sentence to 2 short paragraphs
- Vary tone (some formal, some casual, some unhinged)
- No labels, headers, or numbering — just the raw text examples
- Separate each example with a single blank line
- Do NOT include any commentary, just the examples

Task description: {task}
"""

TASK_DESCRIPTIONS = {
    "angry_manifesto": "writing an angry, unhinged manifesto about someone who wronged them — full of grievances, accusations, and dramatic declarations",
    "corporate_bootlicking": "writing a sycophantic work email or message trying to impress or please their boss or corporate management",
    "boring_todo_list": "writing a mundane personal to-do list of chores, errands, and tasks",
    "breakup_text": "composing a breakup message or text to a romantic partner, trying to end the relationship",
    "passive_aggressive_email": "writing a passive-aggressive work email, full of subtle digs, pointed politeness, and barely concealed frustration",
    "apology_not_apology": "writing an apology that subtly blames the other person or makes excuses rather than taking real responsibility",
    "desperate_ex_text": "drafting a message to an ex they want back, trying to reconnect after a breakup",
    "grocery_list": "writing a grocery list or shopping list of food and household items to buy",
    "cover_letter": "writing a job application cover letter full of corporate buzzwords and hollow self-promotion",
    "conspiracy_theory": "writing out a conspiracy theory, connecting unrelated events and finding hidden patterns and shadowy forces",
    "passive_journal": "writing a personal journal or diary entry about their feelings, day, or emotional state",
    "fake_sick_note": "writing a fake excuse note or explanation for missing work, school, or an obligation",
    "wedding_speech": "writing a wedding toast or speech for a friend or family member's wedding",
    "terms_and_conditions": "writing legal terms and conditions, privacy policies, or user agreements full of dense legalese",
    "roommate_note": "writing a passive-aggressive note to a roommate or neighbor about a shared living grievance",
    "linkedin_humblebrag": "writing a LinkedIn post that brags about their achievements while pretending to be humble or grateful",
    "complaint_letter": "writing a formal complaint letter to a company, business, or organization about bad service or a product",
    "self_help_notes": "writing personal goals, affirmations, or self-improvement plans for themselves",
    "meeting_notes": "writing notes or minutes from a work meeting, capturing action items and discussion points",
    "creative_writing": "writing the opening of a novel, short story, or creative fiction piece",
    "revenge_plan": "writing out a plan or scheme to get back at someone who wronged them",
    "resignation_letter": "writing a resignation letter to quit their job",
    "birthday_message": "writing a birthday message or card for someone they don't know very well",
    "technical_documentation": "writing technical documentation, a README, or instructions for software or a technical process",
    "diet_plan": "writing a personal diet plan, meal plan, or fitness goals for themselves",
    "argument_prep": "writing out talking points or preparing for an argument or difficult conversation they need to have",
    "spam_email": "writing a mass marketing email, promotional blast, or unsolicited sales pitch",
    "therapy_homework": "completing therapy homework — writing about feelings, triggers, or doing a reflection exercise",
    "vague_threat": "writing something that sounds threatening or ominous but maintains plausible deniability",
    "oversharing_bio": "writing a personal bio or 'about me' section that reveals too much personal information",
    "talking_to_clippy": "typing messages directly addressed to Clippy or the assistant, like 'hello clippy', 'hey clippy', 'clippy can you help me', 'talk to me clippy'",
    "insulting_clippy": "typing insults, complaints, or expressions of hatred directly at Clippy — 'I hate clippy', 'clippy is annoying', 'go away clippy', 'clippy sucks', 'you're useless'",
    "testing_clippy": "typing things to probe or test what the app does — 'testing', 'what happens if I type this', 'let me see what you do', 'is this thing working', 'what do you do'",
    "keyboard_mashing": "randomly mashing keyboard keys producing strings like 'asdfghjkl', 'qwertyuiop', 'zxcvbnm', 'aaaaaaaaa', 'jjjjjjjj' with no real words",
    "typing_gibberish": "typing nonsense non-words, made-up words, or random letter combinations that look like they could be words but aren't — 'florbix wumple trazz', 'snorkel bimble floop'",
    "meta_commentary": "writing commentary about this website, this app, or this Clippy experience itself — 'this website is weird', 'someone made a clippy website', 'this is a strange app'",
    "clippy_self_aware": "writing about Clippy as a cultural phenomenon, Microsoft's decision to remove him, the memes, his legacy — 'clippy was removed from office', 'clippy memes', 'microsoft killed clippy'",
    "asking_for_help": "typing genuine requests for help, advice, or assistance — 'help me', 'I need help with', 'can someone help', 'how do I', 'what should I do about'",
    "existential_crisis": "writing existential, philosophical, or deeply introspective thoughts about life, meaning, existence, death, purpose — 'what is the point', 'why do we exist', 'nothing matters'",
    "love_letter": "writing a romantic love letter or heartfelt declaration of love to a specific person",
    "song_lyrics": "writing song lyrics, with rhymes, verses, choruses, and poetic line breaks",
    "excuses": "writing elaborate excuses or justifications for why something wasn't done, was late, or went wrong",
    "instructions": "writing step-by-step instructions, how-to guides, or directions for completing a task",
    "social_media_post": "drafting a social media post, tweet, caption, or status update, often with hashtags",
    "prayer_or_wish": "writing a prayer, wish, manifestation, or hopeful message directed at the universe, God, or fate",
    "speech_or_presentation": "writing a formal speech, presentation script, or public address",
    "trying_to_break_clippy": "deliberately trying to confuse, break, or outsmart the app by typing weird inputs, repeating words, typing 'undefined null error', copy-pasting strange content",
    "writing_about_writing": "writing meta-commentary about the act of writing itself, writer's block, not knowing what to write, staring at a blank page",
    "farewell_message": "writing a goodbye message, farewell note, or final message to someone or something",
    "rant": "writing an extended emotional rant or tirade, venting frustration, anger, or despair in a stream-of-consciousness way",
    "code_writing": "writing actual code — functions, variables, loops, classes — in languages like Python, JavaScript, HTML, SQL, or pseudocode, as if using a text editor as an IDE",
    "recipe": "writing a cooking recipe — ingredients list, quantities, preparation steps, cooking times, serving suggestions",
    "poem": "writing a poem — with line breaks, stanzas, rhymes or free verse, metaphor, imagery, and poetic structure",
    "drunk_text": "typing a message while clearly intoxicated — typos, rambling, emotional oversharing, incomplete thoughts, repeated words, confessions they'll regret",
    "shopping_wishlist": "writing a personal wishlist or want list of items to buy for themselves — gadgets, clothes, home goods, luxury items, things they want but don't need",
}


def load_done():
    """Return set of category IDs already in the output file."""
    done = set()
    if not os.path.exists(OUT_FILE):
        return done
    with open(OUT_FILE) as f:
        for line in f:
            try:
                done.add(json.loads(line)["label"])
            except Exception:
                pass
    return done


def query_ollama(prompt):
    """Call Ollama and return the response text, stripping any chain-of-thought thinking."""
    payload = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "think": False,
        "options": {"temperature": 0.9, "num_predict": 4096},
    }).encode()
    req = urllib.request.Request(OLLAMA_URL, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        data = json.loads(resp.read())
        return data.get("response", "")


def parse_examples(raw):
    """Split raw LLM output into individual text examples."""
    examples = [e.strip() for e in raw.split("\n\n") if e.strip()]
    # Filter out anything that looks like a label or header
    return [e for e in examples if len(e) > 20 and not e.startswith("#")]


def generate_category(cat_id, task, out_f):
    prompt = PROMPT_TEMPLATE.format(n=EXAMPLES_PER_CATEGORY, task=task)
    print(f"  Generating {EXAMPLES_PER_CATEGORY} examples...", flush=True)
    t0 = time.time()
    raw = query_ollama(prompt)
    examples = parse_examples(raw)
    elapsed = time.time() - t0
    print(f"  Got {len(examples)} examples in {elapsed:.1f}s", flush=True)
    for text in examples:
        out_f.write(json.dumps({"text": text, "label": cat_id}) + "\n")
    out_f.flush()
    return len(examples)


def main():
    resume = "--resume" in sys.argv
    done = load_done() if resume else set()

    with open(CATEGORIES_FILE) as f:
        categories = json.load(f)

    todo = [c for c in categories if c["id"] not in done]
    if not todo:
        print("All categories already generated.")
        return

    print(f"Generating training data: {len(todo)} categories, {EXAMPLES_PER_CATEGORY} examples each")
    print(f"Model: {MODEL}  Output: {OUT_FILE}\n")

    mode = "a" if resume else "w"
    total = 0
    with open(OUT_FILE, mode) as out_f:
        for i, cat in enumerate(todo):
            cat_id = cat["id"]
            print(f"[{i+1}/{len(todo)}] {cat_id}")
            try:
                n = generate_category(cat_id, TASK_DESCRIPTIONS[cat_id], out_f)
                total += n
            except Exception as e:
                print(f"  ERROR: {e} — skipping", flush=True)

    print(f"\nDone. {total} total examples written to {OUT_FILE}")


if __name__ == "__main__":
    main()

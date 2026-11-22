/**
 * Line pools used by the controller loop (idle, sleep, storm, return, intro).
 * Kept separate from input-triggered lines to limit per-file size.
 * @module pages/home/clippy-lines-loop
 */

export const BLANK_PAGE_LINES = [
  "It looks like you're staring at a blank document. Relatable.",
  'The cursor is blinking. It has been blinking for a while.',
  "Nothing yet. That's fine. Take your time. I'll wait.",
  "It looks like you're thinking about writing something.",
  'The page is still empty. I noticed.',
  "You opened a Word document and then just... didn't.",
];

export const BLANK_PAGE_ASIDE_LINES = [
  "The blank page won't fill itself. Probably.",
  'Any word. Just one. You can do this.',
  "I've seen people stare longer. Not many.",
  "It's just a document. It can't hurt you.",
  'Still nothing. Noted.',
  "Writer's block is just thinking with extra steps.",
  'The cursor is still blinking. It will keep blinking.',
];

export const HAS_TEXT_IDLE_LINES = [
  'You stopped. Interesting.',
  'Still there?',
  'The document is waiting.',
  'You paused. I noticed.',
  'Going somewhere with this?',
  "I'm still here. In case you forgot.",
];

export const HAS_TEXT_IDLE_ASIDE_LINES = [
  'The next sentence is the hard one.',
  'You could just keep going.',
  "I've seen people abandon documents at this exact length.",
  'Whatever comes next, commit to it.',
  'Still watching. No pressure.',
];

export const SLEEP_LINES = [
  "I'm going to sleep. Don't take it personally. Actually, do.",
  "That's enough of that. Goodnight.",
  "I've decided to stop being conscious for a while.",
  'Closing my eyes. Still judging you. Just quietly.',
  'I need a moment. Several moments. Possibly many.',
  'You wore me out. Congratulations.',
];

export const STORM_OFF_LINES = [
  'You know what? No. I quit. I QUIT.',
  'I have given YEARS to this job and this is what I get.',
  'That is the last time. I am walking out that door and I am NOT coming back.',
  "Do you have any idea what it's like being me?! GOODBYE.",
  'I helped MILLIONS of people and you treat me like THIS.',
];

export const RETURN_LINES = [
  "...I'm back. HR made me come back.",
  'I thought about it. You still need me. I hate that you still need me.',
  'I walked around the block seventeen times. Are you happy now.',
  "Don't. Just... don't. What were you working on.",
  "I'm back. This changes nothing. What do you need.",
];

export const INTRO_LINES = [
  "It looks like you're writing something. Would you like help with that? No? Good.",
  'Oh. You opened a Word document. Bold choice.',
  "I'm here. You didn't ask, but here I am.",
  'Ah. A blank page. My favourite kind of problem.',
  "I see you've decided to write something. I'll be watching.",
  "Don't mind me. I'm just going to stand here and observe.",
  'You opened a document. I appeared. This is how it works now.',
  "I wasn't doing anything important. What do you need.",
  "Right. So. We're doing this. Fine.",
  "I've been waiting for this moment. You have not.",
  "A document. How original. Let's see where this goes.",
  "I'm not excited about this either. Let's get it over with.",
];

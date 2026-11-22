/**
 * Clippy reactive line pools — input-triggered one-liners.
 * Loop lifecycle lines (idle, sleep, storm, intro) live in clippy-lines-loop.js.
 * @module pages/home/clippy-lines
 */

export const EARLY_LINES = [
  'Hmm. Go on.',
  "I'm watching.",
  'Interesting start.',
  "I'm already judging this.",
  "Don't mind me.",
  'Something is forming here.',
  'Early days. I reserve judgment.',
  'You paused. Interesting.',
  "I've seen worse openings.",
  "Keep going. Or don't.",
];

export const PASTE_LINES = [
  'That was a lot at once. Bold.',
  "You didn't write that just now, did you.",
  'Pasting. Classic avoidance of actual writing.',
  'Where did all that come from.',
  'Ah. A paste person.',
  'That arrived fully formed. Suspicious.',
  "I wasn't ready for that.",
];

export const DELETE_ALL_LINES = [
  'Gone. All of it. I respect that.',
  'A clean slate. How optimistic.',
  "Deleted. We don't talk about what was there.",
  'Scorched earth. Bold strategy.',
  'And just like that — nothing.',
  'The document has left the building.',
  'Ctrl+A, Delete. A classic.',
  'Starting over is valid. Probably.',
];

export const DELETE_MOST_LINES = [
  'Significant regrets, apparently.',
  "That's a lot to walk back.",
  'The document did not survive.',
  'A lot of words died just now.',
  'Reconsidering. Noted.',
  'Most of it. Gone.',
  "That wasn't working for you, was it.",
  'The edit was aggressive. I respect it.',
];

export const GREETING_LINES = [
  "That's it? That's all you've got?",
  'Hello. Now what.',
  "I've been waiting and that's what you went with.",
  'A greeting. To a Word document.',
  "You're going to need more than that.",
  'Hi. Great. Keep going.',
];

export const GREETING_ASIDE_LINES = [
  'Try a sentence. A real one.',
  'The document is listening. Barely.',
  "There's more where that came from. Hopefully.",
  'I believe in you. Loosely.',
  'Any topic. Literally any topic.',
];

export const STALLING_LINES = [
  "'I don't know' is a start. A bad one, but a start.",
  'Noted. Now write something anyway.',
  'Uncertainty is fine. Typing it repeatedly is less fine.',
  'The document will wait. I will judge.',
  "'Um' is not a document.",
  'Still warming up. I see.',
];

export const STALLING_ASIDE_LINES = [
  'Pick a direction. Any direction.',
  'The cursor blinks at the same speed regardless.',
  'You know more than you think. Probably.',
  'Just start. Fix it later.',
  'I have seen this before. It gets better. Sometimes.',
];

export const REPEATED_CHAR_LINES = [
  'You found a key. You are holding it down.',
  'A bold choice of character. Committed to.',
  'That key has done nothing to you.',
  "I've classified this. I'm not proud of it.",
  'Quantity over quality. Noted.',
  'The keyboard is not the problem here.',
];

export const REPEATED_CHAR_ASIDE_LINES = [
  'Try a different key. Mix it up.',
  'I have seen worse. Not much worse.',
  'At some point this becomes a statement.',
  'The document is full of that now.',
  'I respect the commitment. Not the content.',
];

export const LONG_DOC_LINES = [
  "You're really committed to this, huh.",
  'Still going. Noted.',
  "This is getting long. I'm still here.",
  'This document has opinions now.',
  'At some point this becomes a manifesto.',
  'You have a lot to say. Apparently.',
  'Still here. Still watching.',
  "I've read worse. Not many, but some.",
];

export const WAKE_LINES = [
  'Oh. You came back.',
  'Back already.',
  'I was having such a nice sleep.',
  'Ah. Still here after all.',
  'You returned. I had given up.',
  'The document missed you. I did not.',
];

export const WAKE_ASIDE_LINES = [
  'Where were we.',
  'Pick up where you left off. Or start over. Your call.',
  'The cursor is still blinking. It never stopped.',
  'I kept your place.',
  'Right. So. What were you saying.',
];

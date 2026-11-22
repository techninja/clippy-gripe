/**
 * Drag reaction lines — Clippy's response to being moved around.
 * @module pages/home/home-drag
 */

import { send, isSleeping } from '#utils/clippy-controller.js';
import { session, recordDrag, recordWake } from './home-session.js';

const DRAG_LINES_FIRST = [
  "Oh. You can move me. That's fine. This is fine.",
  "I didn't know you could do that. I'm not sure how I feel about it.",
  'Repositioning me. Bold.',
  "You found the drag. Most people don't bother.",
];

const DRAG_LINES_GRUMPY = [
  'Again.',
  "You're doing this again.",
  'I was comfortable there.',
  'I had a spot. That was my spot.',
  'Every time.',
];

const DRAG_LINES_SLEEP_WAKE = [
  'I was SLEEPING.',
  'You dragged me. While I was asleep. Incredible.',
  'There was no reason to move me just now.',
  'I was having a dream. About not being dragged.',
];

const DRAG_ANIMS_FIRST = ['GetAttention', 'Alert'];
const DRAG_ANIMS_GRUMPY = ['RestPose', 'Thinking'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function onDragEnd() {
  recordDrag();

  if (isSleeping()) {
    recordWake();
    send({ type: 'play', anim: 'GetAttention', text: pick(DRAG_LINES_SLEEP_WAKE) });
    return;
  }

  if (session.dragCount === 1) {
    send({ type: 'play', anim: pick(DRAG_ANIMS_FIRST), text: pick(DRAG_LINES_FIRST) });
  } else {
    send({ type: 'play', anim: pick(DRAG_ANIMS_GRUMPY), text: pick(DRAG_LINES_GRUMPY) });
  }
}

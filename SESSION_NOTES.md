# Session Notes

## Architecture (current, stable)

### Animation loop (`src/utils/clippy-controller.js`)

Single `_loop(a)` runs forever. At each exit point:

1. Reads `_pending` (set by input reactions via `send()`)
2. Falls back to `_decide()` if nothing pending
3. Executes the command fully before looping

No parallel timers. No external state machines. Input events write intent, loop decides.

`send()` is gated on `isAgentHidden()` — suppresses all commands during the 5s warmup
and the 30s storm-off absence.

### Command types

| Type | Behavior |
|---|---|
| `play` | Linear anim, interruptible by `_pending`. `noInterrupt` variant plays to natural end. |
| `hold` | Loops anim until `_pending` is set. Kick interval re-runs `_decide()` every 1s. |
| `goad` | Speak + idle anim + drain tiredness/boredom, then force one idle cycle. |
| `sleep` | `IdleSnooze` loop, polls `_pending` every 100ms, exits immediately on wake. |
| `storm` | Speak + Wave + Hide, 30s hidden, Show + GetAttention + return line. |
| `idle` | Rest pause (2–7s, accumulates personality), then one idle anim. |

### Personality state (`src/pages/home/home-session.js`)

Three 0–1 floats read by `_decide()`:

- `boredom` — grows each idle anim tick, drains when Clippy reacts or user types
- `tiredness` — grows faster when bored (boredom amplifies gain), drains on typing
- `irritation` — grows on escalating categories (`+0.3`), decays on reactions (`-0.05`)

Cascade: `boredom → tiredness → sleep`. `irritation → storm`.

`_decide()` thresholds (current values):

| Condition | Action |
|---|---|
| `tiredness ≥ 0.85` | sleep |
| `irritation ≥ 0.72` | storm |
| `tiredness ≥ 0.35` + 10-anim cooldown | goad |
| `tiredness ≥ 0.55` or `boredom ≥ 0.60` | Thinking hold |
| otherwise | idle |

After a goad: `tiredness -= 0.15`, `boredom -= 0.10`, forced idle cycle before re-deciding.
This prevents immediate re-entry into Thinking when tiredness is still above threshold.

### Idle anim pools

- Low boredom (`random > boredom`): `IdleEyeBrowRaise` (0ms), `IdleFingerTap` (600ms)
- High boredom: `IdleRopePile` (500ms), `IdleSideToSide` (500ms), `Idle1_1` (500ms), `Processing` (800ms), `Hearing_1` (2000ms)

`minPlayMs` = minimum time before `exitAnimation()` is safe (past all loop entry points).

### Rest pause

`_restPause(a, 2000, 7000)` before each idle anim. Ticks every 500ms, calls
`recordIdleAnim(500)` each tick. Checks thresholds directly each tick to surface
escalation via `_pending` without calling `_decide()` speculatively (avoids premature
side effects on `goatCount`/`_lastGoatAnim`).

### Sleep/wake

`_playSleep` loops `IdleSnooze` with no kick. Polls `_pending` every 100ms, calls
`exitAnimation()` immediately on wake. On wake: `tiredness -= 0.5`, boredom/counters reset.
Speaks `SLEEP_LINES` on entry.

`_waking` lock in `home-idle.js` prevents wake flood — only one `wakeIfSleeping()` fires
per wake event, cleared via `.finally()` when play command resolves.

### Storm

`_doStorm` waits `Math.max(3500, words*400)+300ms` after speaking before `Wave`+`Hide`.
Sets `setAgentHidden(true)` during 30s absence. `recordStorm()` resets all personality floats.

### Hidden flag

`_isHidden` in `clippy-agent.js`, exported as `isAgentHidden()`/`setAgentHidden()`.
Guards both `clippySpeak` and `send()`. Set during 5s warmup and storm-off absence.

### Intro sequence

1. 5s hidden warmup — `recordWarmup()` ticks accumulate tiredness
2. `Show` anim plays
3. `GetAttention` anim plays (`noInterrupt`)
4. `onIntroComplete` fires: `introReady` resolves, intro line spoken from `INTRO_LINES`
5. `_introCooling = true` for balloon read duration — suppresses input reaction anims
6. `_lastReactionAnim` seeded to `'GetAttention'` — first input reaction substitutes `Explain` if category anim would repeat it

### Draft replay

`home-view.js` waits `introReady()` then fires `onInput` with `{noAnim:true, aside:true}`
after 7000ms — speaks classification without interrupting loop's first idle cycle and
without cancelling the intro balloon.

### Balloon positioning

`_balloon._position` patched to anchor vertically relative to `agentRect` — prefers above
Clippy, falls back to below if no room. Horizontal clamp to viewport edges.

Mobile (`< 600px`): Clippy placed at bottom-right of paper (dead zone before text fills it).
Desktop: top-right of paper.

### Balloon suppression

Balloon is a separate DOM element appended to `document.body`, not a child of `a._el`.
Display checks on `a._el` don't suppress it. Must use `isAgentHidden()` flag.

### Debug flags

- `window.__clippyDebugAnim` — vendor animator + agent logs (`[clippy]`, `[agent]`)
- `window.__clippyDebugPersonality` — loop decisions + personality state (`[ctrl:personality]`)

Both set to `true` on localhost in `home-view.js`.

---

## Key invariants

- `send()` is the single gate — gating only `clippySpeak` is insufficient
- `_decide()` has side effects (`goatCount++`, `_lastGoatAnim`) — never call speculatively
- `_idleAnimCount` increments on actual idle anims AND on each 1s kick inside `_playHold` — goad cooldown is anim-count-based, not time-based
- Irritation is sticky by design — only drains `-0.05` per reaction (~17 reactions to drain from 0.85)
- `IdleSnooze` has `exitBranch` on most frames — `exitAnimation()` works correctly

---

## Files (current state)

| File | Role |
|---|---|
| `src/utils/clippy-controller.js` | Full loop, `_decide()`, all anim primitives |
| `src/utils/clippy-agent.js` | Agent loader, hidden flag, balloon patches, intro sequence |
| `src/utils/clippy-speak.js` | `clippySpeak`/`clippyAside`, guards on hidden+sleeping |
| `src/pages/home/home-session.js` | Personality floats, all `record*` functions |
| `src/pages/home/home-input.js` | Input handling, classification, `onInput`, Enter fast-path |
| `src/pages/home/home-idle.js` | `wakeIfSleeping()` only, `_waking` lock |
| `src/pages/home/home-view.js` | Component connect, draft restore, `initClippy` trigger |
| `src/pages/home/clippy-lines.js` | All line pools including `INTRO_LINES`, `SLEEP_LINES`, etc. |
| `src/vendor/clippyjs/index.mjs` | Patched vendor — `window.clearTimeout`, `_sayWords` override |
| `src/clippy-test.html` | Test harness — intro, interrupt, hold, sleep, personality |

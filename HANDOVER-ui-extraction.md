# Handover: moving the board's shared rendering into this package

Written 11 September 2026, at the end of the session that built the model. The
model, the contract, the manifests and both migrations are done and working.
This is the part that was deliberately left.

Read [CONTRACT.md](CONTRACT.md) first, and [README.md](README.md) for the rule
about classic scripts, which is the one constraint here that bites hardest.

## Why this is worth doing, and why it was not done then

Every queue in `~/Code` now shares one model, but only one of them has a front
end. A plan and a task are the same shape of thing in the data and two entirely
separate piles of rendering code on screen. So adding a fourth agent still means
writing a fourth view, which is the cost this whole exercise was meant to remove.

It was left because it is pure refactoring. Nothing a person can see changes,
the session that would have done it had already moved two sets of live data, and
its riskiest step touches the board's own save path. A fresh session does it
more safely.

**Check this is still worth doing before starting.** If no second app has come
along wanting to draw a queue, the honest answer may be to leave the rendering
where it is. Shared code with one consumer is just that consumer's code.

## What is actually shared, measured rather than guessed

About 1,400 of the 10,455 lines in `kanban/js/` are stream-agnostic. The rest
are `todo.md`'s own.

| Already shared, informally | Where |
| --- | --- |
| `mdBlocks`, `openDocModal`, `loadDocBody`, `docItemHTML` | `kanban/js/12-reports.js:569-700`, borrowed by `13-plans.js` |
| the `.repitem` / `.rephead` / `.reptitle` / `.repdate` / `.repsum` CSS | Reports and Plans both draw it |
| `shownBuckets()` and `plansShown()` | `07-render-board.js` and `13-plans.js`, one rule written twice |

| Not shared, and should be | Where |
| --- | --- |
| the card renderer | `cardHTML`, `09-columns.js:234` |
| the column renderer | `renderBoard`, `18-timeline.js:863-1010` |
| the lane vocabulary | the bottom third of `02-state.js`, which is manifest data pretending to be code |
| the chip filter bar | `13-plans.js` hand-rolls its own |

## The order to do it in

Four moves. Each one leaves every suite green and the board working.

**1. `interface/doclist.js`.** The four read-only functions out of
`12-reports.js`. Reports and Plans both switch to it. Safest possible first
move: read-only code, two callers already sharing it, and `test_plans.mjs`
covers it.

**2. `interface/card.js`.** `cardHTML` with a table of field renderers, so the
board registers the two that are its own (the Project note and the Jira link)
rather than the package knowing about either. Verified by `test_canvas.mjs` and
by eye on the Matrix hover preview, which passes `opts.static`.

**3. `interface/lanes.js` and `interface/board.js`.** `renderBoard` becomes
`renderLanes(el, stream, items, opts)`, taking the element rather than reaching
for `$('#board')`, which is what keeps the no-DOM rule true for everything above
it. Keep `02-state.js`'s constants as re-exports so nothing else has to move in
the same change.

**This is the dangerous step.** Its drop handlers are the board's own mutation
path: `dropTask` sets `.dirty`, which autosaves four seconds later with no
confirmation. Four guards, all four, not any one:

- Switch `data/.current` to `_test` for the whole step. Note the old value, put
  it back immediately at the end, and read the file back to check it stuck.
- Work with the tab locked: `load(text, 'name.md', {})` then `state.locked =
  true` before anything else. A locked tab cannot save.
- No board tab open on `twinkl` while it runs.
- Take a fresh backup first, the way `~/Backups/to-dos/2026-09-11-pre-work-streams/`
  was taken. Its README is the shape to copy.

**4. Plans rendered as a peer.** Inbox and Decided through `renderLanes` with
the plans manifest, so a plan is a card in a lane exactly as a task is. Extend
`test_plans.mjs`.

Then `interface/streams.css`, last. `kanban/board.css` is 137 KB and splitting it
before the four moves above makes every one of them a two-file diff.

## What to leave alone

- **`19-drawer.js`.** The most tempting and the wrong one. Almost every field it
  edits is `todo.md`'s own, including the Description caret arithmetic that
  `test_notes.mjs` exists for and that has to click at real coordinates because
  the hit test comes from the browser. A generic item editor is a new drawer
  with three fields, not this one refactored.
- **The Plans view's Queue and Backlog columns.** They are `pick.select()` run
  on demand, with nothing stored but an ordering. Drawing them through the
  generic lane renderer would imply they are stored state, which is the one
  thing they must not imply.
- **`core/todo.js` and `core/todo.py`.** They stay in `to-dos/core/`. The board
  is deployed as a static site where `/core/todo.js` resolves only because the
  file is inside the deployed repo, and `to-dos` has no `package.json` to reach
  a package any other way. Moving them does not degrade the board, it stops it.

## One thing that is not refactoring, if you want it

A task and a plan are now the same shape, and the board draws them in two
places. The interesting version of this work is not "the same code draws both
lists" but **one surface where his tasks and the agents' queues sit side by
side**, which is what the whole model was for. That is a design question rather
than an extraction, and it is worth deciding before move 4 rather than after,
because move 4 is where the answer would land.

## State of things when this was written

Eleven suites green: `core/test_todo.{py,mjs}`,
`agents/night_agent/test_night_agent.py`, `companion/test_companion.py`,
`kanban/test_{plans,schedule,projects,notes}.mjs`,
`PACKAGES/work-streams/test_streams.{py,mjs}`, `improve-agent/test_improve.py`.

`kanban/test_canvas.mjs` was already failing before that session started, on
committed code. It is not related to any of this, and a separate session is on
it. Do not take its output as a signal about this work until it is green again.

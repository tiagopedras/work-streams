# Handover: bringing `IMPROVEMENTS.md` into the stream model

Stage two. Written 11 September 2026, before it was needed, so that the session
that picks it up does not have to reconstruct the reasoning.

Read [CONTRACT.md](CONTRACT.md) first. It is the authority for everything below,
and nothing here overrides it.

## Where stage one got to

The model, the six states and the `stream.json` manifest exist and are described
in the contract. The `to-dos` board and the night agent are the first two
streams. Every `IMPROVEMENTS.md` under `~/Code` is the third, and the improve
agent is its writer.

Before touching anything, take the backups. Every `IMPROVEMENTS.md` under
`~/Code`, and the whole of `improve_agent/state/`, hashed, somewhere outside any
gitignored folder. There is a worked example at
`~/Backups/to-dos/2026-09-11-pre-work-streams/`, including its README, which is
the shape to copy.

## What changes in the file

**The two section headings get numbers.** `## Small` becomes `## 1. Small`, and
`## Big` becomes `## 2. Big`. In the contract a group is a *numbered* second
level heading, and everything else at that level is prose. That rule is what
lets a list file carry an introduction without it being mistaken for work, and
it is what removes a whole class of bug that has already bitten once in
`to-dos`: a reader that had no such rule silently saw an empty document.

`improve/reader.py`'s `KINDS` lookup at line 51 needs the leading number
stripped before it matches. The regex for that is already written twice in
`~/Code/to-dos`, in `plan.py`, as `^\d+[.)]\s*`. Use the same one.

`## Done, from this round` and `## Decisions taken, so they are not re-argued`
stay exactly as they are. They are prose, they are meant to be, and `reader.py`
already treats them that way.

**Three things stop being guessed and start being written down.**

| Today | Becomes |
| --- | --- |
| `done`, inferred from the bold lead being wrapped in `~~` | the checkbox, as every other stream does it |
| `needs_you`, inferred from `[agent: skip]`, `[needs you]`, 20 decision phrases and 9 done phrases | a written field, with the phrases kept only as a fallback for entries nobody has migrated |
| identity, being a hash of the entry's body | `id`, minted once and written in |

The phrase lists are worth keeping as a fallback rather than deleting, because
three skills write this file as prose and will keep producing entries without
the field. That is the divergence `improve-idea/SKILL.md` already warns about:
the skills read the file as prose while `reader.py` reads it by regex, so the
skills will happily show an entry the agent cannot see and nothing warns you.
Stage two is the chance to close that. Do not close it by making the skills
write regex-shaped entries; close it by giving `reader.py` the field to read and
leaving the prose fallback under it.

**`fingerprint` stays, and changes meaning slightly.** It stops being identity
and becomes only change detection, which is what `reader.py:153 _normalised()`
already assumes and what the night agent's version gets wrong. Two
implementations currently disagree about whether whitespace counts: the one here
flattens it, the night agent's does not, so re-wrapping a note costs that agent a
re-plan. The contract's version flattens. Adopting it invalidates every existing
ledger fingerprint once, which costs one pass and nothing else. Say so rather
than discovering it.

## What changes in the agent

`improve_agent` becomes its own writer under the contract's `subprocess` kind,
the same as the night agent. That means one `stream.json` per repo in
`registry.json`, and `improve/stream.py --apply` wrapping the existing
`reader.strike()` at `improve/reader.py:298`.

The point of that is not symmetry. It is that no reader ever writes another
repo's files, which is the same rule `agents-dashboard/CONTRACT.md` already
holds for schedules, for the same reason: two programs writing one file will
eventually give two different answers about it.

## The three skills

`improve-idea`, `improve-list` and `improve-refinement`, in
`~/Code/skills/personal/`. Each needs one line changed, and each says in its own
text that it is mirroring rules implemented in `reader.py`. Those cross
references are the thing to keep true. `improve-list` puts it best: one file is
the executable copy and the other is the readable copy, and a change to either
is a change to both.

## Before starting, check this is still worth doing

`~/Code/CLAUDE.md` says a package earns its place in `PACKAGES/` when a third
app shares it. Until this stage happens, `work_streams` has two consumers and
both are inside `to-dos`, which by that rule means it should have stayed in
`to-dos/core/`.

So this is not optional polish on stage one. It is the thing that makes stage one
correct. If the answer has changed and `IMPROVEMENTS.md` is not joining after
all, the right move is not to leave the package sitting there unproven. It is to
move it back into `to-dos/core/` and close this file.

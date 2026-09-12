# The stream contract, version 1.0

A stream is a queue of work items moving through states. This repo holds three
of them and expects more: the master to-do list, the night agent's plans, and
each repo's `IMPROVEMENTS.md`. In one of them he moves the items. In the others
agents do, off queues he feeds. The goal of this contract is that adding a
fourth means writing a manifest rather than another board.

Nothing here knows what any stream is about. It knows that a stream has lanes,
that an item sits in one state at a time, and that somebody owns the next move.
Everything else, including every word on screen, comes out of the stream's own
manifest.

This is a sibling of `agents-dashboard/CONTRACT.md`, not a version of it. That
one answers *what runs on a schedule and how do I switch it on*, its unit is an
agent, and its transport is a subprocess run a few times a day. This one answers
*what queues of work exist, what is in them, and how do I move one item*, its
unit is a stream, and its reader is a page held open all day over a live
document. A subprocess per read would be unusable, so the transports differ on
purpose.

They meet in one place, and it is worth keeping them met. The agent contract's
`detail.groups[].cards[]` is already a generic work-item card. The card in this
contract is the same shape, so the dashboard's detail sheet and the board's
lanes draw the same object.

## The item

Every item in every stream has these. A stream says which it requires, and
anything else it carries rides along untouched.

| Field | Type | What it answers |
| --- | --- | --- |
| `id` | 6 characters of base36 | which item is this, across a rename |
| `title` | string | what it is called |
| `state` | one of the seven below | where it has got to |
| `owner` | `me`, or an agent's name | who is expected to move it next |
| `seen` | boolean | has the person it is waiting on looked at it |
| `needs_you` | boolean | must an unattended agent leave this alone |
| `resolution` | `actioned`, `completed`, `superseded`, `dropped` | how it ended, only when `done` |
| `feedback` | one line, at most 500 characters | what was wrong with it, addressed to whoever does it next |
| `created` | ISO date, or datetime to the second | when it was written |
| `group`, `lane` | string | which part of the stream it sits in |
| `about` | typed reference, `task:ab12cd` | which item in another stream this concerns |

`id` is minted once and written into the file. Six characters is the same shape
and the same generator as the chat keys in `ai_chat_engine`, which have held up.
It carries no stream prefix, because the stream is always known from where the
item was found, and a reference to another stream names the type explicitly.

`fingerprint` is not a field. It is derived, and it answers a different question:
*has this changed since I last looked*. That is cache invalidation, which is why
an agent keeps one in its own ledger rather than the stream keeping one in the
file. It flattens whitespace before hashing, because reflowing a paragraph is
not a change of mind, and it excludes `id` and `created`, because minting an id
is not an edit.

## The seven states

| State | Means |
| --- | --- |
| `backlog` | no commitment to it yet |
| `ready` | committed, and whoever owns it may pick it up |
| `doing` | in flight |
| `review` | the work is done and needs a verdict from a person |
| `blocked` | cannot move until something else changes |
| `accepted` | a person has approved it; the work it describes has not finished |
| `done` | closed, with `resolution` saying how |

`accepted` is the one state this contract has added since it was written, on
12 Sep 2026, and it is worth saying why it earned the exception the section
below otherwise refuses. It is the gap between approving an item and the work
it describes being finished. A plan he has agreed to sits in that gap while the
run it minted is still going: he is done with it, the work is not. Until now
both were `done`, which made "I have accepted this" and "this is finished" one
answer, and a board had no way to draw them as the two columns they are. The
test for an eighth is the same one this passed: two questions a reader asks
separately, with nothing but a state able to tell them apart.

A stream declares which of the seven it uses and its own word for each. "Waiting
review", "Inbox" and "a branch waiting for you" are one state with three labels.

Two things this deliberately does not do.

**It does not have a state per agent.** An item an agent may pick up is `ready`,
whichever agent that is, and `owner` says which. A plan agreed for the acting
agent and a plan sent back to be written again are both `ready`, owned by
different agents. Giving each its own state would mean an eighth the day a third
agent arrives, and a ninth after that.

**It does not carry a separate flag for having been approved.** A single-valued
`state` is what stops an item being agreed and rejected at once, which means
nothing. `owner` is single-valued for the same reason.

`seen` is a flag rather than a state because nothing acts on it. An unread item
and a read one sit in the same column and are picked up by the same rules. Only
a filter tells them apart.

## Containers

The item model is one thing. How it is written down is a property of the stream,
and there are two ways.

**A list file.** Many items in one Markdown file. Fields are encoded as tags on
the item's own line. `state` and `owner` are not written: they are derived from
the heading the item sits under and the state of its checkbox, because in a list
file those already determine them, and writing them on the line would be a
second copy of a fact already there.

**A folder of documents.** One item per file, fields as frontmatter, the body
below. `state` and `owner` are written, because there is no heading to derive
them from.

Same field names, same state values, two encodings. A stream picks one. The
reason for two rather than one is that a five-kilobyte proposal does not belong
on a line, and a hundred and thirty-seven one-line tasks do not each want a file.

## Lanes and groups

In a list file, a **group** is a numbered second-level heading, `## 3. Design
System`, and a **lane** is a third-level heading under it. The number is what
makes a group a group. Any other `##` is prose, wherever it sits in the file,
which is what lets a list file carry an introduction and a context section
without either being mistaken for work.

In a folder of documents, both are fields.

A stream may also declare **synthetic** lanes: a column the board draws from a
field rather than from a heading, which nothing can be dragged into and which is
never written into the file. The to-do list has one, for anything handed to AI.

## Being found

A stream is any folder with a `stream.json` at its root. This is the same idiom
as `agent.json`, and a folder may hold both: an agent that owns a queue is an
agent and a stream, and the two files answer different questions about it.

```json
{
  "contract": "1.0",
  "id": "tasks",
  "name": "My to-do list",
  "blurb": "the master list, one file, one writer",

  "container": {"kind": "list-file", "path": "data/<dataset>/todo.md"},
  "groups":    {"kind": "heading", "level": 2, "numbered": true, "label": "bucket"},
  "lanes":     {"kind": "heading", "level": 3},

  "states": {
    "backlog": "Backlog", "ready": "To do", "doing": "Doing",
    "review": "Waiting review", "blocked": "Blocked", "done": "Done"
  },
  "reserved": ["Backlog", "To do", "Doing", "Waiting review", "Done"],
  "hints": {"Backlog": "no time pressure yet", "Doing": "current focus, next two weeks"},
  "synthetic": [
    {"lane": "Handed to AI", "before": "done", "when": {"field": "ai", "is": "full"},
     "draggable": false, "hint": "tagged ai:: full, not done yet"}
  ],

  "fields": [
    {"key": "impact", "syntax": "inline", "values": ["high", "med", "low"]},
    {"key": "repeat", "syntax": "span", "own": true}
  ],

  "writer": {"who": "board", "how": {"kind": "http-put", "path": "/data/todo.md"}},
  "views": ["board", "matrix", "timeline", "overview"]
}
```

`reserved` names the lanes that may not be renamed, because something matches
them by string. `hints` is the line of explanation under a column heading.
`fields` declares what this stream carries beyond the canonical set, and how it
is punctuated: `inline` for `[key:: value]`, `span` for a backtick code span.
`own: true` marks a field only this stream understands, which the board renders
as given and never interprets.

`<dataset>` is left unresolved on purpose. Which list is current is the caller's
question, and the callers genuinely disagree about it: the companion is pinned
to one, the night agent follows the pointer file. This package takes a path and
never works one out.

## Moving an item

A stream declares its writer, and there are three kinds. Which one a stream uses
is the single source of the answer, so a route cannot hand a stream a second
writer by being added later.

**`http-put`.** The reader owns the file and writes it whole. Exactly one stream
is allowed this, the one the board itself holds open.

**`subprocess`.** Every stream the reader does not own. One transition goes to
the stream's own command on stdin, and the stream performs the write:

```json
{"stream": "plans",
 "item": {"group": "2026-09-10", "name": "adoption-report.md"},
 "to": "ready", "owner": "night-agent",
 "reason": "Wrong scope: this is about the Foundations file, not the whole library."}
```

One change per call, whole values rather than a merge, and `{"ok": true}` or
`{"ok": false, "error": "..."}` back. This is the agent contract's `apply` verb,
deliberately, down to the semantics. The reason a reader never writes another
stream's files is the reason the dashboard never writes an agent's schedule: two
programs writing one file eventually give two different answers about it.

**`queue-file`.** When the owner cannot be invoked at all, the transition is
appended to a file the owner drains next time it loads. A request naming
something the owner cannot resolve is written back rather than dropped, because
the item it names may simply not exist yet.

## Refusing

A stream that cannot perform a transition says so and changes nothing. A stream
whose command exits non-zero, times out, or prints something that is not JSON is
drawn as one card saying so, with the first line of its stderr on it, and
nothing else on the page is affected. This is what a half-finished edit to a
stream looks like, and a page that went blank for it would hide the one thing
worth reading.

## One writer

Every stream has exactly one writer, and it is enforced rather than asked for.

Reading is free and always available. Writing requires a claim, and a module
that never took one cannot write, so a reader cannot quietly become a writer.
The claim is a lock file the manifest names, holding the process id that took
it. A write from a process that does not hold it is refused.

This is stricter than it sounds because it has to be. The to-do list has been
overwritten for real twice, both times by something that was only meant to be
reading, and both times the process doing it would have failed this check.

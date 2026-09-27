"""The Python half of the manifest suite.

Reads fixtures/streams.json, which holds the *JavaScript* implementation's
answers, and asserts this language gives the same ones. It holds no table of
its own, on purpose: a rule expressed in one language and forgotten in the
other has to fail here rather than let two programs quietly disagree about what
a stream is.

    python3 test_streams.py

If this fails after a deliberate change to interface/manifest.js, regenerate
the fixture (node fixtures/generate.mjs), read the diff, and make the same
change here.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import manifest  # noqa: E402

FIX = json.load(open(os.path.join(HERE, "fixtures", "streams.json"), encoding="utf-8"))

failures = []


def check(name, got, want):
    if got == want:
        print("  ok   %s" % name)
    else:
        print(" FAIL  %s\n         got:  %r\n         want: %r" % (name, got, want))
        failures.append(name)


print("constants, against the other language")
check("contract", manifest.CONTRACT, FIX["contract"])
check("the six states, in order", list(manifest.CANONICAL), FIX["canonical"])
check("which states wait on a person", list(manifest.WAITING_ON_A_PERSON), FIX["waitingOnAPerson"])
check("container kinds", list(manifest.CONTAINERS), FIX["containers"])
check("writer kinds", list(manifest.WRITERS), FIX["writers"])
check("handover levels", list(manifest.HANDOVER_LEVELS), FIX["handoverLevels"])

for name, row in FIX["streams"].items():
    m = row["manifest"]
    print("\nthe %s stream" % name)
    check("%s: validates clean" % name, manifest.validate(m), row["errors"])
    check("%s: lanes, in order" % name,
          json.loads(json.dumps(manifest.lanes(m))), row["lanes"])
    check("%s: owns its file" % name, manifest.owns_its_file(m), row["ownsItsFile"])
    check("%s: label per state" % name,
          {s: manifest.label(m, s) for s in manifest.CANONICAL}, row["labels"])
    check("%s: every label reads back to its state" % name,
          {lab: manifest.canonical(m, lab) for lab in (m.get("states") or {}).values()},
          row["roundTrip"])
    check("%s: reads headings leniently" % name,
          {k: manifest.canonical(m, k) for k in row["lenient"]}, row["lenient"])
    check("%s: waiting on a person" % name,
          {s: manifest.waiting_on_a_person(m, s) for s in manifest.CANONICAL},
          row["waitingOnAPerson"])

print("\nmanifests that are wrong on purpose")
for name, row in FIX["broken"].items():
    check("refuses %s, in the same words" % name,
          manifest.validate(row["manifest"]), row["errors"])

print("\nhistory events")
check("event kinds", list(manifest.EVENT_KINDS), FIX["eventKinds"])
check("what a call did", list(manifest.CALL_DID), FIX["callDid"])
for name, row in FIX["events"].items():
    check("%s: %s" % (name, "refused, in the same words" if row["errors"] else "accepted"),
          manifest.validate_event(row["event"]), row["errors"])

print("\n=== %s ===" % ("all good" if not failures else "%d FAILED" % len(failures)))
sys.exit(1 if failures else 0)

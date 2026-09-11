"""Who is allowed to write a stream right now.

Every stream has one writer. That was a rule people followed until now; this
makes it something the machine checks.

Advisory on purpose. A claim names the process holding it, and a claim whose
process is no longer alive is ignored rather than obeyed. A hard lock would mean
that a crash at the wrong moment leaves a file on disk which refuses every
future save until somebody deletes it by hand, and being locked out of your own
to-do list on a Monday morning is a worse failure than the one being prevented.

What this catches that the conditional write in kanban/server.py does not: that
one asks "are you replacing the version you think you are", which a second
writer usually fails by accident. This asks "are you the writer at all", which
it fails on purpose.
"""

import json
import os
import time

STALE_AFTER = 4 * 60 * 60      # a claim older than this is ignored whatever it says


def _read(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def _alive(pid):
    """Whether that process still exists. Signal 0 checks without sending."""
    try:
        os.kill(int(pid), 0)
        return True
    except (OSError, TypeError, ValueError):
        return False


def holder(path):
    """Who holds this claim, or None if nobody effectively does.

    A claim from a process that has gone, or one older than STALE_AFTER, reads
    as nobody. That is the whole of what makes this advisory.
    """
    row = _read(path)
    if not isinstance(row, dict):
        return None
    if not _alive(row.get("pid")):
        return None
    if time.time() - float(row.get("at") or 0) > STALE_AFTER:
        return None
    return row


def claim(path, who):
    """Take the claim, unless somebody live already holds it.

    Returns (True, row) or (False, whoever has it). Writing the file is the
    caller's business; this only answers whether they may.
    """
    held = holder(path)
    if held and held.get("pid") != os.getpid():
        return False, held
    row = {"who": who, "pid": os.getpid(), "at": time.time()}
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(row, fh)
        fh.flush()
        os.fsync(fh.fileno())
    os.replace(tmp, path)
    return True, row


def release(path):
    """Give it up. Safe to call when it was never taken."""
    try:
        row = _read(path)
        if isinstance(row, dict) and row.get("pid") == os.getpid():
            os.remove(path)
    except OSError:
        pass


def refusal(path, who):
    """One line saying why a write is refused, or None when it is allowed."""
    held = holder(path)
    if not held or held.get("pid") == os.getpid():
        return None
    return "%s is writing this list (pid %s). Nothing was written." % (
        held.get("who") or "something else", held.get("pid"))

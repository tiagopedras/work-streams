/**
 * The JavaScript half of the manifest suite.
 *
 *   node test_streams.mjs
 *
 * Reads fixtures/streams.json and asserts interface/manifest.js still gives
 * those answers. It holds no table of its own, the same arrangement as
 * to-dos/core/test_todo.mjs, so a rule can only be changed in one place.
 *
 * The fixture is generated from this same file, so this half is not proving
 * the implementation right. It is proving the fixture is not stale: a change
 * to manifest.js without a regenerate fails here, and a regenerate without the
 * matching change to manifest.py fails in the Python half. Between them the
 * two languages cannot drift apart in silence, which is the only thing that
 * ever actually goes wrong with a rule written down twice.
 *
 * No browser, no server, no file of his in reach.
 */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { loadManifest } from './load.mjs'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const FIX = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'streams.json'), 'utf8'))
const ws = loadManifest()

let failures = 0
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const check = (name, got, want) => {
  if (same(got, want)) { console.log(`  ok   ${name}`); return }
  failures++
  console.log(` FAIL  ${name}\n         got:  ${JSON.stringify(got)}\n         want: ${JSON.stringify(want)}`)
}

console.log('the constants the fixture was built from')
check('contract', ws.WS_CONTRACT, FIX.contract)
check('the six states, in order', ws.WS_CANONICAL, FIX.canonical)
check('which states wait on a person', ws.WS_WAITING_ON_A_PERSON, FIX.waitingOnAPerson)
check('container kinds', ws.WS_CONTAINERS, FIX.containers)
check('writer kinds', ws.WS_WRITERS, FIX.writers)

/* Not from the fixture: the one rule the table cannot state about itself. */
check('no state is listed twice', ws.WS_CANONICAL.length, new Set(ws.WS_CANONICAL).size)
check('every waiting state is a real state',
  ws.WS_WAITING_ON_A_PERSON.every(s => ws.WS_CANONICAL.includes(s)), true)

for (const [name, row] of Object.entries(FIX.streams)) {
  const m = row.manifest
  console.log(`\nthe ${name} stream`)
  check(`${name}: validates clean`, ws.wsValidate(m), row.errors)
  check(`${name}: lanes, in order`, ws.wsLanes(m), row.lanes)
  check(`${name}: owns its file`, ws.wsOwnsItsFile(m), row.ownsItsFile)
  check(`${name}: label per state`,
    Object.fromEntries(ws.WS_CANONICAL.map(s => [s, ws.wsLabel(m, s)])), row.labels)
  check(`${name}: every label reads back to its state`,
    Object.fromEntries(Object.values(m.states || {}).map(l => [l, ws.wsCanonical(m, l)])), row.roundTrip)
  check(`${name}: reads headings leniently`,
    Object.fromEntries(Object.keys(row.lenient).map(k => [k, ws.wsCanonical(m, k)])), row.lenient)
  check(`${name}: waiting on a person`,
    Object.fromEntries(ws.WS_CANONICAL.map(s => [s, ws.wsWaitingOnAPerson(m, s)])), row.waitingOnAPerson)
  /* A lane list a board can actually draw: every name distinct, and exactly
     one lane per state it uses except where a synthetic one sits alongside. */
  const lanes = ws.wsLanes(m)
  check(`${name}: no two lanes share a name`, lanes.length, new Set(lanes.map(l => l.lane)).size)
  check(`${name}: every state it declares has a lane`,
    Object.keys(m.states || {}).every(s => lanes.some(l => l.state === s)), true)
}

console.log('\nmanifests that are wrong on purpose')
for (const [name, row] of Object.entries(FIX.broken))
  check(`refuses ${name}, in the same words`, ws.wsValidate(row.manifest), row.errors)

console.log('\nhistory events')
check('event kinds', ws.WS_EVENT_KINDS, FIX.eventKinds)
check('what a call did', ws.WS_CALL_DID, FIX.callDid)
for (const [name, row] of Object.entries(FIX.events))
  check(`${name}: ${row.errors.length ? 'refused, in the same words' : 'accepted'}`, ws.wsValidateEvent(row.event), row.errors)
check('the two good events are accepted and every other one refused',
  Object.entries(FIX.events).filter(([, r]) => !r.errors.length).map(([k]) => k),
  ['a planner called in', 'a view from elsewhere'])

/* A broken manifest that says nothing is the failure mode that matters, since
   it is indistinguishable from a good one. */
console.log('\nand none of them passes quietly')
for (const [name, row] of Object.entries(FIX.broken))
  check(`${name} is actually reported`, row.errors.length > 0, true)

console.log(`\n=== ${failures ? `${failures} FAILED` : 'all good'} ===`)
process.exit(failures ? 1 : 0)

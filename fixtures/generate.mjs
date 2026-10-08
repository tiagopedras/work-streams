/**
 * Generates fixtures/streams.json by running interface/manifest.js.
 *
 * The table is never hand-written. It holds this code's own answers, and both
 * suites read it, so a rule changed in one language and forgotten in the other
 * shows up as a failure in the other rather than as two programs quietly
 * disagreeing. Same arrangement as bench/core/fixtures.
 *
 *   node fixtures/generate.mjs
 *
 * Re-run it after changing manifest.js, read the diff, and commit the two
 * together.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadManifest } from '../load.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ctx = loadManifest()

/* A stream whose manifest has gone from disk keeps the copy the fixture already
   holds, so regenerating for an unrelated change does not drop its checks. The
   plans stream's went from to-dos when its Plans view did, on 22 Sep 2026. */
const before = existsSync(join(here, 'streams.json'))
  ? JSON.parse(readFileSync(join(here, 'streams.json'), 'utf8')).streams || {} : {}
const read = (key, file) => existsSync(file)
  ? JSON.parse(readFileSync(file, 'utf8'))
  : (before[key] || {}).manifest
const real = {
  tasks: read('tasks', '/Users/tiagopedras/Code/bench/stream.json'),
  plans: read('plans', '/Users/tiagopedras/Code/bench/agents/plan-agent/stream.json')
}

/* Manifests that are wrong on purpose. Each names one mistake somebody will
   actually make, and pins the words they get back for it, because an error
   message nobody reads is the same as no check at all. */
const broken = {
  'wrong contract':      { ...real.tasks, contract: '0.9' },
  'no id':               { ...real.tasks, id: '' },
  'unknown container':   { ...real.tasks, container: { kind: 'sqlite', path: 'x.db' } },
  'container no path':   { ...real.tasks, container: { kind: 'list-file' } },
  'eighth state':        { ...real.tasks, states: { ...real.tasks.states, parked: 'Parked' } },
  'two states one label':{ ...real.tasks, states: { ...real.tasks.states, doing: 'Backlog' } },
  'no done':             { ...real.tasks, states: { backlog: 'Backlog', ready: 'To do' } },
  'unknown writer':      { ...real.tasks, writer: { who: 'board', how: { kind: 'ftp' } } },
  'subprocess no apply': { ...real.tasks, writer: { who: 'x', how: { kind: 'subprocess' } } },
  'http-put no path':    { ...real.tasks, writer: { who: 'board', how: { kind: 'http-put' } } },
  'reserved ghost lane': { ...real.tasks, reserved: [...real.tasks.reserved, 'Parked'] },
  'synthetic nowhere':   { ...real.tasks, synthetic: [{ lane: 'Odd', before: 'nonsense' }] }
}

const resolve = m => ({
  errors: ctx.wsValidate(m),
  lanes: ctx.wsLanes(m),
  ownsItsFile: ctx.wsOwnsItsFile(m),
  labels: Object.fromEntries(ctx.WS_CANONICAL.map(s => [s, ctx.wsLabel(m, s)])),
  /* Both directions, because the round trip is the thing that actually has to
     hold: a heading read out of a file has to come back as the same heading. */
  roundTrip: Object.fromEntries(
    Object.entries(m.states || {}).map(([s, lab]) => [lab, ctx.wsCanonical(m, lab)])),
  /* Read leniently: these come off headings somebody typed. */
  lenient: {
    'waiting review': ctx.wsCanonical(m, 'waiting review'),
    '  To  Do  ': ctx.wsCanonical(m, '  To  Do  '),
    'INBOX': ctx.wsCanonical(m, 'INBOX'),
    'nothing like it': ctx.wsCanonical(m, 'nothing like it'),
    '': ctx.wsCanonical(m, '')
  },
  waitingOnAPerson: Object.fromEntries(
    ctx.WS_CANONICAL.map(s => [s, ctx.wsWaitingOnAPerson(m, s)]))
})

/* History events, good and bad. Each bad one names one mistake a writer will
   make, and pins the words it gets back. */
const events = {
  'a planner called in':   { at: '2026-09-27T02:14:09', about: 'task:ab12cd', by: 'Plan agent', kind: 'call',
                             called: 'team-agent', bucket: 'people', did: 'work' },
  'a view from elsewhere': { at: '2026-09-27', about: 'task:ab12cd', by: 'Plan agent', kind: 'call',
                             called: 'design-agent', did: 'view', note: 'crosses into DS' },
  'not an object':         'Plan agent asked the DS agent',
  'nothing in it':         {},
  'bad about':             { at: '2026-09-27T02:14:09', about: 'ab12cd', by: 'Plan agent', kind: 'call',
                             called: 'design-agent', did: 'view' },
  'bad at':                { at: 'yesterday', about: 'task:ab12cd', by: 'Plan agent', kind: 'call',
                             called: 'design-agent', did: 'view' },
  'unknown kind':          { at: '2026-09-27', about: 'task:ab12cd', by: 'Plan agent', kind: 'moved' },
  'calls nobody':          { at: '2026-09-27', about: 'task:ab12cd', by: 'Plan agent', kind: 'call', did: 'view' },
  'calls itself':          { at: '2026-09-27', about: 'task:ab12cd', by: 'Plan agent', kind: 'call',
                             called: 'Plan agent', did: 'work' },
  'did nothing named':     { at: '2026-09-27', about: 'task:ab12cd', by: 'Plan agent', kind: 'call',
                             called: 'design-agent' },
  'long note':             { at: '2026-09-27', about: 'task:ab12cd', by: 'Plan agent', kind: 'call',
                             called: 'design-agent', did: 'view', note: 'x'.repeat(501) }
}

const out = {
  note: 'Generated by fixtures/generate.mjs from interface/manifest.js. Never edit by hand.',
  contract: ctx.WS_CONTRACT,
  canonical: ctx.WS_CANONICAL,
  waitingOnAPerson: ctx.WS_WAITING_ON_A_PERSON,
  containers: ctx.WS_CONTAINERS,
  writers: ctx.WS_WRITERS,
  eventKinds: ctx.WS_EVENT_KINDS,
  callDid: ctx.WS_CALL_DID,
  handoverLevels: ctx.WS_HANDOVER_LEVELS,
  streams: Object.fromEntries(Object.entries(real).map(([k, m]) => [k, { manifest: m, ...resolve(m) }])),
  /* Input and expected output together, so the other language can be shown the
     identical manifest rather than building its own approximation of it. */
  broken: Object.fromEntries(
    Object.entries(broken).map(([k, m]) => [k, { manifest: m, errors: ctx.wsValidate(m) }])),
  events: Object.fromEntries(
    Object.entries(events).map(([k, ev]) => [k, { event: ev, errors: ctx.wsValidateEvent(ev) }]))
}
writeFileSync(join(here, 'streams.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`streams.json: ${Object.keys(out.streams).length} streams, ${Object.keys(out.broken).length} broken cases, ${Object.keys(out.events).length} history events`)

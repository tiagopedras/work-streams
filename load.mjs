/**
 * Loads the classic scripts in interface/ into a bare context and hands back
 * what they declare.
 *
 * They are classic scripts, so they export nothing: they declare into whatever
 * global they are given, and a vm context is that global. Half of what they
 * declare is `const`, though, and a classic script's top-level `const` goes
 * into the global *lexical* environment rather than onto the global object.
 * That is exactly why the board can see these names from its own scripts, and
 * why reading them off the context object here gives undefined. So the source
 * is evaluated with a trailing expression naming what is wanted, and the value
 * of that expression is what comes back.
 *
 * The same trick, and the same reason, as to-dos/core/test_todo.mjs.
 */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import vm from 'node:vm'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))

export function loadInterface (file, wanted) {
  const p = path.join(HERE, 'interface', file)
  const source = fs.readFileSync(p, 'utf8') + '\n;({ ' + wanted.join(', ') + ' });\n'
  return vm.runInNewContext(source, {}, { filename: `interface/${file}` })
}

export const MANIFEST_NAMES = [
  'WS_CONTRACT', 'WS_CANONICAL', 'WS_WAITING_ON_A_PERSON', 'WS_CONTAINERS', 'WS_WRITERS',
  'wsValidate', 'wsLabel', 'wsCanonical', 'wsLanes', 'wsWaitingOnAPerson', 'wsOwnsItsFile',
  'WS_EVENT_KINDS', 'WS_CALL_DID', 'wsValidateEvent'
]

export const loadManifest = () => loadInterface('manifest.js', MANIFEST_NAMES)

import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'

test('Homepage query excludes explicitly hidden carousel items', async () => {
  const querySource = await readFile(resolve(process.cwd(), 'src/cms/query.ts'), 'utf8')

  assert.match(querySource, /media\[visible != false\]\[\]/)
  assert.match(querySource, /prototypes\[visible != false\]\[\]->/)
  assert.match(querySource, /projects\[visible != false\]\[\]->/)
})

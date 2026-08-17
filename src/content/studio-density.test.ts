import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'
import {compactStudioTheme} from '../../studio/theme'

test('Studio keeps control spacing intact while tightening large vertical rhythm', () => {
  const compactSpace = (compactStudioTheme as unknown as {space: number[]}).space

  assert.deepEqual(compactSpace.slice(0, 4), [0, 4, 8, 12])
  assert.deepEqual(compactSpace.slice(4), [16, 24, 36, 56, 88, 136])
})

test('compact spacing applies to the whole Studio and preserves stronger Homepage boundaries', async () => {
  const [config, homepageSection] = await Promise.all([
    readFile(resolve(process.cwd(), 'studio/sanity.config.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/components/HomepageSectionField.tsx'), 'utf8'),
  ])

  assert.match(config, /theme: compactStudioTheme/)
  assert.match(homepageSection, /<Stack gap=\{3\}/)
  assert.match(homepageSection, /<Box paddingTop=\{4\}/)
  assert.match(homepageSection, /data-homepage-section-divider/)
})

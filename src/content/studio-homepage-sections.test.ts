import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'

test('Homepage Studio editor separates all eight logical sections without changing data fields', async () => {
  const [schema, component] = await Promise.all([
    readFile(resolve(process.cwd(), 'studio/schemas/documents/homePage.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/components/HomepageSectionField.tsx'), 'utf8'),
  ])

  for (const [field, title] of [
    ['hero', 'Hero'],
    ['stats', 'Achievements'],
    ['featuredProjectKicker', 'Showcased Project'],
    ['approach', 'Design Approach'],
    ['designLabTitle', 'Design Lab'],
    ['shippedWork', 'Shipped Work'],
    ['about', 'About'],
    ['contact', 'Contact'],
  ]) {
    assert.match(component, new RegExp(`${field}: '${title}'`))
  }

  assert.equal((schema.match(/components: \{field: HomepageSectionField\}/g) ?? []).length, 8)
  assert.match(component, /sectionTitles\[props\.name\]/)
  assert.doesNotMatch(component, /sectionTitles\[props\.schemaType\.name\]/)
  assert.match(component, /data-homepage-section-divider/)
  assert.match(component, /width: '100vw'/)
  assert.match(component, /borderTop: '2px solid var\(--card-focus-ring-color/)
  assert.match(component, /fieldsWithRepeatedSectionLabel\.has\(props\.name\)/)
  assert.match(component, /\.\.\.props, title: undefined/)
  assert.match(component, /props\.renderDefault\(fieldProps\)/)
})

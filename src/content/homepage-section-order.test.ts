import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'
import {adaptCmsPayload} from '../cms/adapter'
import {validateHomePagePayload} from '../cms/validation'
import {
  DEFAULT_HOMEPAGE_SECTION_ORDER,
  DEFAULT_HOMEPAGE_SECTION_SETTINGS,
  createHomepageSectionSettings,
  isHomepageSectionConfiguration,
  isHomepageSectionOrder,
  resolveHomepageSectionOrder,
} from './homepage-sections'
import {localHomePagePayload} from './portfolio'

const customOrder = [
  'hero',
  'showcasedProject',
  'achievements',
  'designApproach',
  'shippedWork',
  'designLab',
  'about',
  'contact',
] as const

test('Homepage section order defaults to the current rendered sequence', () => {
  assert.deepEqual(DEFAULT_HOMEPAGE_SECTION_ORDER, [
    'hero',
    'achievements',
    'showcasedProject',
    'designLab',
    'shippedWork',
    'designApproach',
    'about',
    'contact',
  ])
  assert.deepEqual(resolveHomepageSectionOrder(undefined), DEFAULT_HOMEPAGE_SECTION_ORDER)
  assert.deepEqual(
    DEFAULT_HOMEPAGE_SECTION_SETTINGS.map(({section, visible}) => ({section, visible})),
    DEFAULT_HOMEPAGE_SECTION_ORDER.map((section) => ({section, visible: true})),
  )
})

test('Homepage section order preserves legacy strings and a complete custom editorial sequence', () => {
  assert.equal(isHomepageSectionOrder(customOrder), true)
  assert.deepEqual(resolveHomepageSectionOrder(customOrder), customOrder)
  assert.deepEqual(adaptCmsPayload({page: {sectionOrder: [...customOrder]}}).site.sectionOrder, customOrder)
})

test('Homepage section visibility hides sections without losing their editorial position', () => {
  const settings = createHomepageSectionSettings(customOrder).map((setting) => (
    setting.section === 'designLab' || setting.section === 'contact'
      ? {...setting, visible: false}
      : setting
  ))

  assert.equal(isHomepageSectionConfiguration(settings), true)
  assert.deepEqual(resolveHomepageSectionOrder(settings), customOrder.filter(
    (section) => section !== 'designLab' && section !== 'contact',
  ))
  assert.deepEqual(
    adaptCmsPayload({page: {sectionOrder: settings}}).site.sectionOrder,
    customOrder.filter((section) => section !== 'designLab' && section !== 'contact'),
  )
  assert.equal(settings.find(({section}) => section === 'designLab')?.visible, false)
  assert.equal(settings.findIndex(({section}) => section === 'designLab'), 5)
})

test('Homepage section configuration rejects missing, duplicate, and unknown sections', () => {
  assert.equal(isHomepageSectionConfiguration(createHomepageSectionSettings()), true)
  assert.equal(isHomepageSectionConfiguration(createHomepageSectionSettings().slice(0, -1)), false)
  assert.equal(isHomepageSectionConfiguration([
    ...createHomepageSectionSettings().slice(0, -1),
    {...createHomepageSectionSettings()[0], _key: 'duplicate'},
  ]), false)
  assert.equal(isHomepageSectionConfiguration([
    ...createHomepageSectionSettings().slice(0, -1),
    {_key: 'other', _type: 'homepageSectionSetting', section: 'other', visible: true},
  ]), false)

  assert.equal(isHomepageSectionOrder(['hero', 'contact']), true)
  assert.equal(isHomepageSectionOrder(['hero', 'hero']), false)
  assert.equal(isHomepageSectionOrder([...DEFAULT_HOMEPAGE_SECTION_ORDER.slice(0, -1), 'other']), false)

  const payload = structuredClone(localHomePagePayload)
  payload.site.sectionOrder = ['hero', 'hero'] as typeof payload.site.sectionOrder
  assert.throws(
    () => validateHomePagePayload(payload),
    /site\.sectionOrder must contain only known homepage sections without duplicates/,
  )
})

test('Homepage Studio combines drag order and per-section visibility before Hero', async () => {
  const [schema, input, query, page, migration] = await Promise.all([
    readFile(resolve(process.cwd(), 'studio/schemas/documents/homePage.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/components/HomepageSectionOrderInput.tsx'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/cms/query.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/scripts/migration-documents.ts'), 'utf8'),
  ])

  assert.ok(schema.indexOf("name: 'sectionOrder'") < schema.indexOf("name: 'hero'"))
  assert.match(schema, /title: 'Website section order'/)
  assert.match(schema, /\.length\(DEFAULT_HOMEPAGE_SECTION_ORDER\.length\)/)
  assert.match(schema, /isHomepageSectionConfiguration/)
  assert.match(schema, /HomepageSectionOrderItem/)
  assert.match(schema, /components: \{item: HomepageSectionOrderItem\}/)
  assert.match(schema, /disableActions: \['add', 'addBefore', 'addAfter', 'remove', 'duplicate', 'copy'\]/)
  assert.match(input, /Use current website order/)
  assert.match(input, /Enable hide and show controls/)
  assert.match(input, /EyeOpenIcon/)
  assert.match(input, /EyeClosedIcon/)
  assert.match(input, /aria-pressed=\{isVisible\}/)
  assert.match(input, /set\(!isVisible, \['visible'\]\)/)
  assert.match(input, /data-homepage-section-visible/)
  assert.match(input, /data-homepage-section-visibility-toggle/)
  assert.match(query, /sectionOrder,/)
  assert.match(migration, /sectionOrder: createHomepageSectionSettings\(site\.sectionOrder\)/)
  assert.match(page, /site\.sectionOrder\.map/)
  assert.match(page, /visibleHomepageSections\.has\(section\)/)
  assert.match(page, /const brandHref = visibleHomepageSections\.has\('hero'\)/)
  for (const section of DEFAULT_HOMEPAGE_SECTION_ORDER) {
    assert.match(page, new RegExp(`data-homepage-section="${section}"`))
  }
  assert.doesNotMatch(page, /style=.*order|class:list=.*order/)
})

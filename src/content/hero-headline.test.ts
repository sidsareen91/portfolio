import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'
import {
  HERO_ACCENT_MARK,
  findLargestFittingHeroFontSize,
  heroHeadlineText,
  migrateLegacyHeroHeadline,
  normalizeHeroHeadline,
} from './hero-headline'

const legacyHeadline = ['I design', 'playable systems', 'then prove them', 'in‑engine.']

test('migrates the four legacy strings into one headline without wording loss', () => {
  const migrated = migrateLegacyHeroHeadline(legacyHeadline)
  assert.equal(migrated.length, 1)
  assert.equal(heroHeadlineText(migrated), 'I design playable systems then prove them in‑engine.')
  assert.deepEqual(
    migrated[0].children.filter(({marks}) => marks?.includes(HERO_ACCENT_MARK)).map(({text}) => text),
    ['playable systems'],
  )
})

test('preserves an arbitrary selected Hero Accent phrase from Portable Text', () => {
  const segments = normalizeHeroHeadline([{
    _type: 'block',
    children: [
      {_type: 'span', text: 'Build ', marks: []},
      {_type: 'span', text: 'playable proof', marks: [HERO_ACCENT_MARK]},
      {_type: 'span', text: ' quickly.', marks: []},
    ],
  }])

  assert.deepEqual(segments, [
    {text: 'Build '},
    {text: 'playable proof', accent: true},
    {text: ' quickly.'},
  ])
  assert.equal(heroHeadlineText(segments), 'Build playable proof quickly.')
})

test('uses the approved maximum size when the current headline already fits', () => {
  assert.deepEqual(findLargestFittingHeroFontSize({max: 72, min: 44, fits: () => true}), {
    fontSize: 72,
    resized: false,
    overflow: false,
  })
})

test('scales a longer headline down progressively without crossing the minimum', () => {
  const result = findLargestFittingHeroFontSize({
    max: 72,
    min: 44,
    precision: 0.1,
    fits: (fontSize) => fontSize <= 55,
  })
  assert.equal(result.resized, true)
  assert.equal(result.overflow, false)
  assert.ok(result.fontSize <= 55)
  assert.ok(result.fontSize >= 54.9)
})

test('reports overflow at the readable minimum instead of shrinking below it', () => {
  assert.deepEqual(findLargestFittingHeroFontSize({max: 72, min: 44, fits: () => false}), {
    fontSize: 44,
    resized: true,
    overflow: true,
  })
})

test('caps headline height without reserving unused mobile lines', async () => {
  const css = await readFile(resolve(process.cwd(), 'src/styles/home.css'), 'utf8')
  const headlineHeightCaps = css.match(
    /max-block-size:\s*calc\(var\(--hero-headline-max-size\) \* 0\.94 \* \d\);/g,
  ) ?? []

  assert.equal(headlineHeightCaps.length, 3)
  assert.doesNotMatch(
    css,
    /^\s*block-size:\s*calc\(var\(--hero-headline-max-size\)/m,
  )
})

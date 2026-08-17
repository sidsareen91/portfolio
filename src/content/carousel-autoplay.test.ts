import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'
import {adaptCmsPayload} from '../cms/adapter'
import {validateHomePagePayload} from '../cms/validation'
import {localHomePagePayload} from './portfolio'

test('each carousel maps its own independent autoplay setting', () => {
  const payload = adaptCmsPayload({
    page: {
      hero: {autoSwitchItems: false, switchIntervalSeconds: 3},
      featuredProject: {galleryAutoSwitchItems: true, gallerySwitchIntervalSeconds: 9},
      designLabAutoSwitchItems: true,
      designLabSwitchIntervalSeconds: 12,
    },
  })

  assert.deepEqual(payload.site.carousels, {
    hero: {enabled: false, seconds: 3},
    bellyBrawl: {enabled: true, seconds: 9},
    designLab: {enabled: true, seconds: 12},
  })
})

test('missing settings preserve the current per-carousel behavior', () => {
  assert.deepEqual(adaptCmsPayload({}).site.carousels, {
    hero: {enabled: true, seconds: 7},
    bellyBrawl: {enabled: true, seconds: 7},
    designLab: {enabled: false, seconds: 7},
  })
})

test('production validation rejects unsafe carousel intervals', () => {
  for (const [carousel, seconds] of [
    ['hero', 0],
    ['bellyBrawl', 61],
    ['designLab', 2.5],
  ] as const) {
    const payload = structuredClone(localHomePagePayload)
    payload.site.carousels[carousel].seconds = seconds
    assert.throws(
      () => validateHomePagePayload(payload),
      new RegExp(`site\\.carousels\\.${carousel}\\.seconds must be a whole number between 1 and 60`),
    )
  }
})

test('Studio exposes compact inline controls for all three carousels', async () => {
  const [homePageSchema, projectSchema, carouselControls] = await Promise.all([
    readFile(resolve(process.cwd(), 'studio/schemas/documents/homePage.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/schemas/documents/project.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/components/HeroCarouselControls.tsx'), 'utf8'),
  ])

  for (const field of [
    'autoSwitchItems',
    'switchIntervalSeconds',
    'designLabAutoSwitchItems',
    'designLabSwitchIntervalSeconds',
  ]) assert.match(homePageSchema, new RegExp(`name: '${field}'`))

  assert.match(projectSchema, /name: 'galleryAutoSwitchItems'/)
  assert.match(projectSchema, /name: 'gallerySwitchIntervalSeconds'/)
  assert.equal((`${homePageSchema}\n${projectSchema}`.match(/options: \{layout: 'checkbox'\}/g) ?? []).length, 3)
  assert.equal((`${homePageSchema}\n${projectSchema}`.match(/Rule\.integer\(\)\.min\(1\)\.max\(60\)/g) ?? []).length, 3)
  assert.equal((`${homePageSchema}\n${projectSchema}`.match(/options: \{columns: 2\}/g) ?? []).length, 3)
  assert.equal((`${homePageSchema}\n${projectSchema}`.match(/field: CarouselAutoSwitchField/g) ?? []).length, 2)
  assert.equal((`${homePageSchema}\n${projectSchema}`.match(/field: CarouselSwitchTimeField/g) ?? []).length, 2)
  assert.equal((`${homePageSchema}\n${projectSchema}`.match(/field: CarouselFollowingArrayField/g) ?? []).length, 2)
  assert.match(carouselControls, /designLabAutoSwitchItems: 'Auto-switch Design Lab'/)
  assert.match(carouselControls, /galleryAutoSwitchItems: 'Auto-switch gallery'/)
  assert.match(carouselControls, /CAROUSEL_ARRAY_SPACING_ADJUSTMENT = 24/)
  assert.ok(homePageSchema.indexOf("name: 'autoSwitchItems'") < homePageSchema.indexOf("name: 'media'"))
  assert.ok(homePageSchema.indexOf("name: 'designLabAutoSwitchItems'") < homePageSchema.indexOf("name: 'prototypes'"))
  assert.ok(projectSchema.indexOf("name: 'galleryAutoSwitchItems'") < projectSchema.indexOf("name: 'galleryMedia'"))
})

test('frontend reads each carousel setting and no longer hardcodes seven seconds', async () => {
  const homepage = await readFile(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8')

  assert.match(homepage, /data-auto-switch=\{String\(site\.carousels\.hero\.enabled\)\}/)
  assert.match(homepage, /data-auto-switch=\{String\(site\.carousels\.bellyBrawl\.enabled\)\}/)
  assert.match(homepage, /data-auto-switch=\{String\(site\.carousels\.designLab\.enabled\)\}/)
  assert.match(homepage, /Number\(root\.dataset\.switchSeconds\) \* 1000/)
  assert.match(homepage, /Number\(prototypeModule\?\.dataset\.switchSeconds\) \* 1000/)
  assert.doesNotMatch(homepage, /setInterval\([^\n]+, 7000\)/)
})

test('autoplay waits for user idleness and active video completion', async () => {
  const homepage = await readFile(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8')

  assert.match(homepage, /const createIdleAutoplayController =/)
  assert.match(homepage, /timer = window\.setTimeout\(\(\) =>/)
  assert.doesNotMatch(homepage, /window\.setInterval\(/)
  assert.match(homepage, /activeVideo\.addEventListener\('ended', handleVideoEnded, \{once: true\}\)/)
  assert.match(homepage, /root\.addEventListener\('carouselvideoplay', autoplay\.stop\)/)
  assert.match(homepage, /root\.addEventListener\('carouselvideoend', autoplay\.start\)/)
  assert.match(homepage, /document\.hidden\) resetAllCarouselVideos\(\)/)
  assert.match(homepage, /window\.addEventListener\('pagehide', resetAllCarouselVideos\)/)
  assert.match(homepage, /root\.addEventListener\('pointerdown', \(\) => \{/)
  assert.match(homepage, /pointerHeld = true[\s\S]*autoplay\.stop\(\)/)
  assert.match(homepage, /root\.addEventListener\('pointerup', releasePointer/)
  assert.match(homepage, /prototypeAutoplay\?\.reset\(\)/)
})

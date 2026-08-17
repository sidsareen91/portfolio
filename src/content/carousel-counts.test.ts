import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'
import {validateHomePagePayload} from '../cms/validation'
import {localHomePagePayload, type HomePagePayload} from './portfolio'

const withCarouselCount = (count: number): HomePagePayload => {
  const payload = structuredClone(localHomePagePayload)
  payload.site.hero.headline = [
    {text: 'I design '},
    {text: 'playable systems', accent: true},
    {text: ' then prove them in-engine.'},
  ]
  payload.site.profile.portrait.fit = 'cover'
  payload.site.shippedWork.forEach((project) => { project.media.fit = 'cover' })
  const heroMedia = payload.site.hero.media[0]
  const projectMedia = payload.site.bellyBrawl.media[0]
  const prototype = payload.site.prototypes[0]
  heroMedia.fit = 'cover'
  projectMedia.fit = 'cover'
  prototype.media.fit = 'cover'

  payload.site.hero.media = Array.from({length: count}, () => structuredClone(heroMedia))
  payload.site.bellyBrawl.media = Array.from({length: count}, () => structuredClone(projectMedia))
  payload.site.prototypes = Array.from({length: count}, (_, index) => ({
    ...structuredClone(prototype),
    slug: `${prototype.slug}-${index + 1}`,
    title: `${prototype.title} ${index + 1}`,
  }))

  return payload
}

const withShippedWorkCount = (count: number): HomePagePayload => {
  const payload = withCarouselCount(1)
  const project = payload.site.shippedWork[0]
  payload.site.shippedWork = Array.from({length: count}, (_, index) => ({
    ...structuredClone(project),
    slug: `${project.slug}-${index + 1}`,
    title: `${project.title} ${index + 1}`,
  }))
  return payload
}

for (const count of [1, 2, 3, 10]) {
  test(`homepage carousel payload accepts ${count} item${count === 1 ? '' : 's'}`, () => {
    assert.doesNotThrow(() => validateHomePagePayload(withCarouselCount(count)))
  })
}

for (const count of [1, 4, 10]) {
  test(`shipped work accepts ${count} item${count === 1 ? '' : 's'}`, () => {
    assert.doesNotThrow(() => validateHomePagePayload(withShippedWorkCount(count)))
  })
}

test('Studio carousel cardinality permits the approved open-ended counts', async () => {
  const [homePageSchema, projectSchema] = await Promise.all([
    readFile(resolve(process.cwd(), 'studio/schemas/documents/homePage.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/schemas/documents/project.ts'), 'utf8'),
  ])
  const heroMedia = homePageSchema.slice(
    homePageSchema.indexOf("name: 'media'"),
    homePageSchema.indexOf("name: 'stats'"),
  )
  const prototypes = homePageSchema.slice(
    homePageSchema.indexOf("name: 'prototypes'"),
    homePageSchema.indexOf("name: 'shippedWork'"),
  )
  const shippedProjects = homePageSchema.slice(
    homePageSchema.indexOf("name: 'projects'"),
    homePageSchema.indexOf("name: 'about'"),
  )
  const gallery = projectSchema.slice(
    projectSchema.indexOf("name: 'galleryMedia'"),
    projectSchema.indexOf('  preview:'),
  )

  assert.match(heroMedia, /Rule\.required\(\)\.min\(1\)/)
  assert.doesNotMatch(heroMedia, /\.length\(|\.max\(/)
  assert.match(prototypes, /Rule\.required\(\)\.min\(1\)\.unique\(\)/)
  assert.doesNotMatch(prototypes, /\.max\(/)
  assert.match(shippedProjects, /Rule\.required\(\)\.min\(1\)\.unique\(\)/)
  assert.doesNotMatch(shippedProjects, /\.length\(|\.max\(/)
  assert.doesNotMatch(gallery, /Rule\.required|\.min\(|\.max\(|\.length\(/)
})

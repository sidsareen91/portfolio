import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'
import {adaptCmsPayload} from '../cms/adapter'
import {resolveProjectExternalLinks} from './project-links'
import {prepareProjectDetailPreview} from './project-detail-preview'
import {
  getSummaryCharacterCount,
  SUMMARY_RECOMMENDED_CHARACTER_COUNT,
} from '../../studio/components/SummaryTextInput'

const gifMedia = (name: string) => ({
  kind: 'image' as const,
  imageAsset: {url: `https://cdn.sanity.test/${name}.gif`, mimeType: 'image/gif'},
})

test('summary character count matches the shared 250-character recommendation', () => {
  assert.equal(SUMMARY_RECOMMENDED_CHARACTER_COUNT, 250)
  assert.equal(getSummaryCharacterCount(undefined), 0)
  assert.equal(getSummaryCharacterCount('Belly Brawl'), 11)
  assert.equal(getSummaryCharacterCount('x'.repeat(275)), 275)
})

test('project external links preserve the approved order and reject non-HTTPS values', () => {
  assert.deepEqual(resolveProjectExternalLinks({
    googlePlayUrl: ' https://play.google.com/store/apps/details?id=example ',
    appStoreUrl: 'http://apps.apple.com/example',
    officialUrl: 'https://example.com/project',
  }), [
    {
      kind: 'googlePlay',
      label: 'Google Play',
      href: 'https://play.google.com/store/apps/details?id=example',
    },
    {kind: 'official', label: 'Official Site', href: 'https://example.com/project'},
  ])
})

test('shipped detail media uses the ordered gallery and maps project-owned detail content', () => {
  const {site} = adaptCmsPayload({
    page: {
      shippedWork: {
        projects: [{
          title: 'Example',
          slug: 'example',
          role: 'Designer',
          homepageSummary: 'Project context.',
          facts: [
            '  10M+ DOWNLOADS  ',
            {text: '  MOBILE  ', color: 'coral'},
          ],
          contributionSummary: 'Personal contribution.',
          primaryMedia: gifMedia('cover'),
          galleryMedia: [gifMedia('one'), gifMedia('two')],
          appStoreUrl: 'https://apps.apple.com/example',
        }],
      },
    },
  })

  assert.deepEqual(site.shippedWork[0].detailMedia.map(({src}) => src), [
    'https://cdn.sanity.test/one.gif',
    'https://cdn.sanity.test/two.gif',
  ])
  assert.equal(site.shippedWork[0].summary, 'Project context.')
  assert.deepEqual(site.shippedWork[0].facts, [
    {text: '10M+ DOWNLOADS', color: 'yellow'},
    {text: 'MOBILE', color: 'coral'},
  ])
  assert.equal(site.shippedWork[0].contribution, 'Personal contribution.')
  assert.deepEqual(site.shippedWork[0].externalLinks, [
    {kind: 'appStore', label: 'App Store', href: 'https://apps.apple.com/example'},
  ])
})

test('featured project facts use the canonical project field', () => {
  const {site} = adaptCmsPayload({
    page: {
      featuredProject: {
        title: 'Belly Brawl',
        slug: 'belly-brawl',
        role: 'Designer',
        homepageSummary: 'Project context.',
        contributionSummary: 'Contribution context.',
        facts: [
          {text: '  4-PLAYER LOCAL MULTIPLAYER  ', color: 'mint'},
          {text: '  UE5  ', color: 'yellow'},
        ],
        primaryMedia: gifMedia('belly-cover'),
      },
    },
  })

  assert.deepEqual(site.bellyBrawl.facts, [
    {text: '4-PLAYER LOCAL MULTIPLAYER', color: 'mint'},
    {text: 'UE5', color: 'yellow'},
  ])
})

test('shipped detail media falls back to primary media when the gallery is empty', () => {
  const {site} = adaptCmsPayload({
    page: {
      shippedWork: {
        projects: [{
          title: 'Fallback',
          slug: 'fallback',
          role: 'Designer',
          homepageSummary: 'Fallback context.',
          primaryMedia: gifMedia('cover'),
        }],
      },
    },
  })

  assert.equal(site.shippedWork[0].detailMedia.length, 1)
  assert.equal(site.shippedWork[0].detailMedia[0].src, 'https://cdn.sanity.test/cover.gif')
  assert.equal(site.shippedWork[0].contribution, undefined)
  assert.deepEqual(site.shippedWork[0].facts, [])
  assert.deepEqual(site.shippedWork[0].externalLinks, [])
})

test('primary video fallback stays playable while the homepage card remains a poster', () => {
  const {site} = adaptCmsPayload({
    page: {
      shippedWork: {
        projects: [{
          title: 'Video fallback',
          slug: 'video-fallback',
          role: 'Designer',
          homepageSummary: 'Video project context.',
          primaryMedia: {
            kind: 'video',
            videoUrl: 'https://cdn.sanity.test/evidence.mp4',
          },
        }],
      },
    },
  })

  assert.equal(site.shippedWork[0].detailMedia[0].kind, 'video')
  assert.equal(site.shippedWork[0].detailMedia[0].src, 'https://cdn.sanity.test/evidence.mp4')
  assert.equal(site.shippedWork[0].media.kind, 'image')
})

test('published query and dialogs use canonical project and contribution fields only', async () => {
  const [query, homepage, adapter] = await Promise.all([
    readFile(resolve(process.cwd(), 'src/cms/query.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/cms/adapter.ts'), 'utf8'),
  ])

  const shippedQuery = query.slice(query.indexOf('shippedWork{'), query.indexOf('about{'))
  for (const field of ['homepageSummary', 'facts', 'contributionSummary', 'galleryMedia', 'googlePlayUrl', 'appStoreUrl', 'officialUrl']) {
    assert.match(shippedQuery, new RegExp(field))
  }
  assert.match(homepage, /data-project-dialog=\{project\.slug\}/)
  assert.doesNotMatch(homepage, /data-project-dialog=\{site\.bellyBrawl\.slug\}/)
  assert.match(homepage, /site\.bellyBrawl\.facts\.map/)
  assert.match(homepage, /<h3>The project<\/h3>/)
  assert.match(homepage, /<h3>My contribution<\/h3>/)
  assert.doesNotMatch(query, /modalSummary/)
  assert.doesNotMatch(adapter, /modalSummary/)
  assert.doesNotMatch(homepage, /modalSummary/)
})

test('shipped-project navigation excludes the Belly Brawl detail panel', async () => {
  const homepage = await readFile(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8')

  assert.match(
    homepage,
    /querySelectorAll<HTMLElement>\('\[data-project-detail\]\[data-project-index\]'\)/,
  )
  assert.doesNotMatch(
    homepage,
    /const shippedProjectPanels = projectPanels\.filter\(\(panel\) => !panel\.classList\.contains\('project-detail--legacy'\)\)/,
  )
})

test('development project-detail preview fills only missing review states', () => {
  const source = structuredClone(adaptCmsPayload({
    page: {
      shippedWork: {
        projects: [{
          title: 'Early Learn',
          slug: 'early-learn',
          role: 'Designer',
          homepageSummary: 'PLACEHOLDER — Final Early Learn homepage summary needed',
          primaryMedia: gifMedia('cover'),
        }],
      },
    },
  }).site.shippedWork)

  const [preview] = prepareProjectDetailPreview(source, true)
  assert.match(preview.summary, /^PLACEHOLDER — Early Learn was an educational/)
  assert.match(preview.contribution ?? '', /^PLACEHOLDER — This section will explain/)
  assert.equal(preview.detailMedia.length, 3)
  assert.deepEqual(preview.detailLinks, [])

  const [production] = prepareProjectDetailPreview(source, false)
  assert.equal(production.summary, source[0].summary)
  assert.equal(production.contribution, undefined)
  assert.equal(production.detailMedia.length, 1)
  assert.deepEqual(production.detailLinks, [])
})

test('Kitchen Story facts preview is development-only and real CMS facts take priority', () => {
  const kitchenStory = structuredClone(adaptCmsPayload({
    page: {
      shippedWork: {
        projects: [{
          title: 'Kitchen Story',
          slug: 'kitchen-story',
          role: 'Designer',
          homepageSummary: 'Kitchen Story overview.',
          primaryMedia: gifMedia('kitchen-story'),
        }],
      },
    },
  }).site.shippedWork)

  const [preview] = prepareProjectDetailPreview(kitchenStory, true)
  assert.deepEqual(preview.facts, [
    {text: '10M+ DOWNLOADS', color: 'yellow'},
    {text: 'TIME MANAGEMENT / SIMULATION', color: 'mint'},
    {text: 'MULTIPLAYER', color: 'coral'},
    {text: 'MOBILE', color: 'lavender'},
  ])
  assert.deepEqual(prepareProjectDetailPreview(kitchenStory, false)[0].facts, [])

  kitchenStory[0].facts = [{text: 'CMS FACT', color: 'coral'}]
  assert.deepEqual(prepareProjectDetailPreview(kitchenStory, true)[0].facts, [
    {text: 'CMS FACT', color: 'coral'},
  ])
})

test('project Studio exposes canonical shipped detail fields and HTTPS links', async () => {
  const [projectSchema, factSchema, factInput, homepage, css] = await Promise.all([
    readFile(resolve(process.cwd(), 'studio/schemas/documents/project.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/schemas/objects/projectFact.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'studio/components/ProjectFactsInput.tsx'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/styles/home.css'), 'utf8'),
  ])
  const contributionField = projectSchema.slice(
    projectSchema.indexOf("name: 'contributionSummary'"),
    projectSchema.indexOf("name: 'modalSummary'"),
  )
  const homepageSummaryField = projectSchema.slice(
    projectSchema.indexOf("name: 'homepageSummary'"),
    projectSchema.indexOf("name: 'facts'"),
  )
  const retiredDialogSummary = projectSchema.slice(
    projectSchema.indexOf("name: 'modalSummary'"),
    projectSchema.indexOf("name: 'primaryMedia'"),
  )
  const galleryField = projectSchema.slice(
    projectSchema.indexOf("name: 'galleryMedia'"),
    projectSchema.indexOf('  preview:'),
  )

  assert.doesNotMatch(contributionField, /hidden:/)
  assert.match(homepageSummaryField, /Rule\.required\(\)/)
  assert.match(homepageSummaryField, /components: \{input: SummaryTextInput\}/)
  assert.match(homepageSummaryField, /Rule\.max\(250\)\.warning/)
  assert.match(contributionField, /components: \{input: SummaryTextInput\}/)
  assert.match(contributionField, /Rule\.max\(250\)\.warning/)
  assert.doesNotMatch(homepageSummaryField, /Rule\.required\(\)\.max/)
  assert.doesNotMatch(contributionField, /Rule\.max\(250\)\.custom/)
  assert.match(retiredDialogSummary, /hidden: true/)
  assert.doesNotMatch(galleryField, /hidden:/)
  const factsField = projectSchema.slice(
    projectSchema.indexOf("name: 'facts'"),
    projectSchema.indexOf("name: 'contributionSummary'"),
  )
  assert.match(factsField, /type: 'array'/)
  assert.match(factsField, /defineArrayMember\(\{type: 'projectFact'\}\)/)
  assert.match(factsField, /components: \{input: ProjectFactsInput\}/)
  assert.match(factsField, /Rule\.max\(6\)\.custom/)
  assert.match(factSchema, /PROTOTYPE_TAG_COLORS\.map/)
  assert.match(factSchema, /name: 'text'/)
  assert.match(factSchema, /name: 'color'/)
  assert.match(factSchema, /initialValue: \{color: 'yellow'\}/)
  assert.match(factInput, /Enable colors for existing facts/)
  assert.match(factInput, /text: value/)
  assert.match(factInput, /color: 'yellow'/)
  assert.match(homepage, /data-fact-color=\{fact\.color\}/)
  for (const color of ['yellow', 'mint', 'coral', 'lavender']) {
    assert.match(css, new RegExp(`project-detail-facts li\\[data-fact-color='${color}'\\]`))
  }
  for (const field of ['googlePlayUrl', 'appStoreUrl', 'officialUrl']) {
    assert.match(galleryField, new RegExp(`name: '${field}'`))
  }
  assert.match(galleryField, /Rule\.uri\(\{scheme: \['https'\]\}\)/)
})

import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import test from 'node:test'
import {HERO_ACCENT_MARK, heroHeadlineText} from '../../src/content/hero-headline'
import {
  assertDraftSeedApproved,
  assertDraftSeedTarget,
  assertMigrationApproved,
  buildDraftSeedDocuments,
  buildDraftSeedPreview,
  buildDryRunPreview,
  buildMigrationDocuments,
  collectMigrationCompatibilityIssues,
  collectMigrationMediaSources,
  collectMigrationReadinessChecklist,
  previewImageResolver,
  requiredEditorialInputs,
} from './migration-documents'

const documents = await buildMigrationDocuments(previewImageResolver)
const draftDocuments = await buildDraftSeedDocuments(previewImageResolver)
const serialized = JSON.stringify(documents)
const serializedDrafts = JSON.stringify(draftDocuments)
const projects = documents.filter(({_type}) => _type === 'project')
const [
  indexSource,
  adapterSource,
  querySource,
  validationSource,
  siteSettingsSchemaSource,
  projectSchemaSource,
  homePageSchemaSource,
  mediaSchemaSource,
  migrationScriptSource,
  sanityConfigSource,
  duplicateProjectActionSource,
] = await Promise.all([
  readFile(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8'),
  readFile(resolve(process.cwd(), 'src/cms/adapter.ts'), 'utf8'),
  readFile(resolve(process.cwd(), 'src/cms/query.ts'), 'utf8'),
  readFile(resolve(process.cwd(), 'src/cms/validation.ts'), 'utf8'),
  readFile(resolve(process.cwd(), 'studio/schemas/documents/siteSettings.ts'), 'utf8'),
  readFile(resolve(process.cwd(), 'studio/schemas/documents/project.ts'), 'utf8'),
  readFile(resolve(process.cwd(), 'studio/schemas/documents/homePage.ts'), 'utf8'),
  readFile(resolve(process.cwd(), 'studio/schemas/objects/media.ts'), 'utf8'),
  readFile(resolve(process.cwd(), 'studio/scripts/migrate-content.ts'), 'utf8'),
  readFile(resolve(process.cwd(), 'studio/sanity.config.ts'), 'utf8'),
  readFile(resolve(process.cwd(), 'studio/actions/duplicateProjectAction.ts'), 'utf8'),
])

test('preserves the explicit write approval guard', () => {
  assert.throws(() => assertMigrationApproved(undefined), /SANITY_MIGRATION_APPROVED=yes/)
  assert.throws(() => assertMigrationApproved('true'), /SANITY_MIGRATION_APPROVED=yes/)
  assert.doesNotThrow(() => assertMigrationApproved('yes'))
})

test('uses a separate approval guard and fixed target for draft seeding', () => {
  assert.throws(() => assertDraftSeedApproved(undefined), /SANITY_DRAFT_SEED_APPROVED=yes/)
  assert.throws(() => assertDraftSeedApproved('true'), /SANITY_DRAFT_SEED_APPROVED=yes/)
  assert.doesNotThrow(() => assertDraftSeedApproved('yes'))
  assert.doesNotThrow(() => assertDraftSeedTarget('5536cj5d', 'production'))
  assert.throws(() => assertDraftSeedTarget('another-project', 'production'), /5536cj5d\/production/)
  assert.throws(() => assertDraftSeedTarget('5536cj5d', 'staging'), /5536cj5d\/production/)

  assert.throws(() => assertMigrationApproved(undefined), /SANITY_MIGRATION_APPROVED=yes/)
  assert.doesNotThrow(() => assertMigrationApproved('yes'))
  assert.match(migrationScriptSource, /isDraftSeed \? \[\] : requiredEditorialInputs\(\)/)
  assert.match(migrationScriptSource, /assertDraftSeedApproved\(process\.env\.SANITY_DRAFT_SEED_APPROVED\)/)
  assert.match(migrationScriptSource, /assertMigrationApproved\(process\.env\.SANITY_MIGRATION_APPROVED\)/)
  assert.match(migrationScriptSource, /buildDraftSeedDocuments\(uploadImage, localHomePagePayload\)/)
})

test('draft seed creates only Sanity draft IDs and no published portfolio documents', () => {
  assert.equal(draftDocuments.length, 10)
  assert.ok(draftDocuments.every(({_id}) => _id.startsWith('drafts.')))
  assert.equal(draftDocuments.some(({_id}) => !String(_id).startsWith('drafts.')), false)
  assert.deepEqual(draftDocuments.map(({_id}) => _id), [
    'drafts.project-belly-brawl',
    'drafts.project-wyb-the-play-social',
    'drafts.project-early-learn',
    'drafts.project-kitchen-story',
    'drafts.project-world-of-cricket',
    'drafts.prototype-networked-leap-attack',
    'drafts.prototype-combat-readability-test',
    'drafts.prototype-arena-pressure-loop',
    'drafts.siteSettings',
    'drafts.homePage',
  ])
})

test('portfolio document IDs stay on the public root path', () => {
  for (const document of documents) {
    assert.equal(document._id.includes('.'), false, `${document._id} would be private in a public dataset`)
  }

  for (const document of draftDocuments) {
    const publishedId = document._id.replace(/^drafts\./, '')
    assert.equal(publishedId.includes('.'), false, `${publishedId} would be private after publication`)
  }
})

test('unfinished prototypes retain current local editing structure only as drafts', () => {
  const combat = draftDocuments.find(({_id}) => _id === 'drafts.prototype-combat-readability-test')
  const arena = draftDocuments.find(({_id}) => _id === 'drafts.prototype-arena-pressure-loop')

  for (const prototype of [combat, arena]) {
    assert.ok(prototype)
    assert.equal(prototype._type, 'prototype')
    assert.equal(prototype.tagLabel, 'Prototype')
    assert.equal(prototype.tagColor, 'yellow')
    assert.equal((prototype.tabs as unknown[]).length, 2)
    assert.ok(prototype.primaryMedia)
    assert.equal(Object.hasOwn(prototype, 'blueprintUrl'), false)
    assert.equal(Object.hasOwn(prototype, 'blueprintCtaEnabled'), false)
    assert.equal(Object.hasOwn(prototype, 'blueprintCtaLabel'), false)
  }

  assert.equal(documents.find(({_id}) => _id === 'prototype-combat-readability-test')?.title, undefined)
  assert.equal(documents.find(({_id}) => _id === 'prototype-arena-pressure-loop')?.title, undefined)
})

test('draft seed keeps unapproved editorial and accessibility values absent', () => {
  for (const forbidden of [
    'Available on request',
    'Request rÃ©sumÃ©',
    'yellow jacket',
    'I worked on',
    'I worked as',
    '#resume',
    '#design-lab',
  ]) {
    assert.equal(serializedDrafts.includes(forbidden), false, `draft seed contains ${forbidden}`)
  }

  const settings = draftDocuments.find(({_id}) => _id === 'drafts.siteSettings')
  const bellyBrawl = draftDocuments.find(({_id}) => _id === 'drafts.project-belly-brawl')
  assert.ok(settings)
  assert.ok(bellyBrawl)
  for (const field of ['location', 'defaultSeo', 'resumeUrl']) {
    assert.equal(Object.hasOwn(settings, field), false)
  }
  for (const field of ['homepageSummary', 'contributionSummary']) {
    assert.equal(Object.hasOwn(bellyBrawl, field), false)
  }
})

test('draft homepage keeps canonical references that resolve through Sanity draft perspective', () => {
  const homepage = draftDocuments.find(({_id}) => _id === 'drafts.homePage')
  assert.ok(homepage)
  assert.deepEqual(homepage.featuredProject, {
    _type: 'reference',
    _ref: 'project-belly-brawl',
    _weak: true,
    _strengthenOnPublish: {type: 'project'},
  })
  assert.deepEqual(
    (homepage.prototypes as Array<{_ref: string}>).map(({_ref}) => _ref),
    [
      'prototype-networked-leap-attack',
      'prototype-combat-readability-test',
      'prototype-arena-pressure-loop',
    ],
  )
  assert.ok((homepage.prototypes as Array<{_weak: boolean}>).every(({_weak}) => _weak))
  assert.ok(
    (homepage.prototypes as Array<{_strengthenOnPublish: {type: string}}>).every(
      ({_strengthenOnPublish}) => _strengthenOnPublish.type === 'prototype',
    ),
  )
  const shipped = (homepage.shippedWork as {projects: Array<{
    _weak: boolean
    _strengthenOnPublish: {type: string}
  }>}).projects
  assert.ok(shipped.every(({_weak}) => _weak))
  assert.ok(shipped.every(({_strengthenOnPublish}) => _strengthenOnPublish.type === 'project'))
})

test('migration writes one marked Hero headline block instead of four line items', () => {
  const homepage = documents.find(({_id}) => _id === 'homePage')
  assert.ok(homepage)
  const headline = (homepage.hero as {headline: Array<{
    _type: string
    children: Array<{text: string; marks?: string[]}>
  }>}).headline

  assert.equal(headline.length, 1)
  assert.equal(headline[0]._type, 'block')
  assert.equal(heroHeadlineText(headline), 'I design playable systems then prove them in‑engine.')
  assert.deepEqual(
    headline[0].children.filter(({marks}) => marks?.includes(HERO_ACCENT_MARK)).map(({text}) => text),
    ['playable systems'],
  )
})

test('Studio exposes one constrained Hero editor with a visible manual coral accent', async () => {
  const decoratorSource = await readFile(
    resolve(process.cwd(), 'studio/components/HeroAccentDecorator.tsx'),
    'utf8',
  )
  const headlineBlock = homePageSchemaSource.slice(
    homePageSchemaSource.indexOf("name: 'headline'"),
    homePageSchemaSource.indexOf("name: 'media'"),
  )
  assert.match(headlineBlock, /title: 'Headline'/)
  assert.match(headlineBlock, /type: 'block'/)
  assert.match(headlineBlock, /title: 'Coral Accent'/)
  assert.match(headlineBlock, /icon: HeroAccentIcon/)
  assert.match(headlineBlock, /component: HeroAccentDecorator/)
  assert.match(headlineBlock, /Select the words you want colored/)
  assert.match(headlineBlock, /styles: \[\]/)
  assert.match(headlineBlock, /lists: \[\]/)
  assert.doesNotMatch(headlineBlock, /Headline lines|Exactly four lines|length\(4\)/)
  assert.match(decoratorSource, /data-hero-accent-preview/)
  assert.match(decoratorSource, /#f45532/)
})

test('keeps Hero carousel controls compact with the approved defaults', () => {
  const heroBlock = homePageSchemaSource.slice(
    homePageSchemaSource.indexOf("name: 'hero'"),
    homePageSchemaSource.indexOf("name: 'stats'"),
  )

  assert.match(heroBlock, /name: 'carouselControls'/)
  assert.match(heroBlock, /options: \{columns: 2\}/)
  assert.match(heroBlock, /title: 'Auto-switch Hero'/)
  assert.match(heroBlock, /title: 'Switch time \(seconds\)'/)
  assert.match(heroBlock, /name: 'autoSwitchItems'[\s\S]*?initialValue: true/)
  assert.match(heroBlock, /name: 'switchIntervalSeconds'[\s\S]*?initialValue: 7/)
  assert.match(heroBlock, /placeholder: '7'/)
  assert.match(heroBlock, /fieldset: 'carouselControls'/)
  assert.match(heroBlock, /components: \{field: HeroMediaField, input: MediaArrayInput\}/)
})

test('frontend keeps one semantic h1, the eyebrow, and inline accent rendering', () => {
  assert.match(indexSource, /<p class="eyebrow">\{site\.hero\.eyebrow\}<\/p>/)
  assert.equal((indexSource.match(/<h1\b/g) ?? []).length, 1)
  assert.match(indexSource, /<h1 id="hero-title" data-hero-headline>/)
  assert.match(indexSource, /segment\.accent/)
  assert.doesNotMatch(indexSource, /site\.hero\.headline\[\d\]/)
})

test('draft seed preserves the Belly Brawl gallery and reuses the first item as primary fallback', () => {
  const bellyBrawl = draftDocuments.find(({_id}) => _id === 'drafts.project-belly-brawl')
  assert.ok(bellyBrawl)
  const primary = bellyBrawl.primaryMedia as {image: {asset: {_ref: string}}}
  const gallery = bellyBrawl.galleryMedia as Array<{image: {asset: {_ref: string}}; _key: string}>
  assert.equal(gallery.length, 3)
  assert.equal(primary.image.asset._ref, gallery[0].image.asset._ref)
})

test('draft seed preview remains write-free and reports deduplicated media accurately', async () => {
  const preview = await buildDraftSeedPreview()
  assert.equal(preview.mode, 'draft-seed-dry-run')
  assert.deepEqual(preview.target, {projectId: '5536cj5d', dataset: 'production'})
  assert.equal(preview.writesPerformed, false)
  assert.equal(preview.assetsUploaded, false)
  assert.equal(preview.draftDocumentCount, 10)
  assert.equal(preview.publishedDocumentCount, 0)
  assert.equal(preview.publishedDocumentIds.length, 0)
  assert.equal(preview.bellyBrawlGalleryCount, 3)
  assert.equal(preview.mediaPlacementCount, 16)
  assert.equal(preview.uniqueAssetsToUpload, 11)
  assert.deepEqual(preview.placeholderAssetsIncluded, [
    '/media/design-lab-gameplay-placeholder.png',
    '/media/belly-brawl-concept-placeholder.png',
    '/media/leap-attack-greybox-placeholder.png',
  ])

  const reused = preview.assetsToUpload.find(
    ({source}) => source === '/media/design-lab-gameplay-placeholder.png',
  )
  assert.deepEqual(reused?.placements, [
    'homePage.hero.media[2]',
    'prototype.arena-pressure-loop.primaryMedia',
  ])
})

test('omits revoked site settings and generated contact or SEO values', () => {
  const settings = documents.find(({_id}) => _id === 'siteSettings')
  assert.ok(settings)

  for (const field of [
    'location',
    'linkedinUrl',
    'discordUrl',
    'resumeLabel',
    'resumeFile',
    'resumeUrl',
    'defaultSeo',
  ]) {
    assert.equal(Object.hasOwn(settings, field), false, `siteSettings.${field} should be omitted`)
  }

  const portrait = settings.portrait as Record<string, unknown>
  assert.equal(Object.hasOwn(portrait, 'alt'), false)
  assert.equal(serialized.includes('Available on request'), false)
  assert.equal(serialized.includes('yellow jacket'), false)
  assert.equal(serialized.includes('subject='), false)
})

test('keeps résumé content optional through Studio, adapter, validation, and frontend', () => {
  const resumeLabelBlock = siteSettingsSchemaSource.slice(
    siteSettingsSchemaSource.indexOf("name: 'resumeLabel'"),
    siteSettingsSchemaSource.indexOf("name: 'resumeFile'"),
  )

  assert.doesNotMatch(siteSettingsSchemaSource, /Add a resume file or resume URL/)
  assert.doesNotMatch(resumeLabelBlock, /Rule\.required/)
  assert.match(adapterSource, /if \(resumeLabel && resumeUrl\)/)
  assert.match(indexSource, /hasResumeCta/)
  assert.doesNotMatch(validationSource, /site\.contact\.links.*Résumé/)
})

test('uses the explicitly approved current project type and omits all Belly Brawl summaries', () => {
  const bellyBrawl = documents.find(({_id}) => _id === 'project-belly-brawl')
  assert.ok(bellyBrawl)
  assert.equal(bellyBrawl.projectType, 'current')
  assert.equal(bellyBrawl.role, 'Game & Level Design Lead · Technical Design')

  for (const field of ['homepageSummary', 'contributionSummary']) {
    assert.equal(Object.hasOwn(bellyBrawl, field), false)
  }
})

test('represents the complete Belly Brawl gallery in source order with primary fallback', () => {
  const bellyBrawl = documents.find(({_id}) => _id === 'project-belly-brawl')
  assert.ok(bellyBrawl)

  const primaryMedia = bellyBrawl.primaryMedia as {image: {asset: {_ref: string}}}
  const galleryMedia = bellyBrawl.galleryMedia as Array<{image: {asset: {_ref: string}}}>
  const refs = galleryMedia.map(({image}) => image.asset._ref)

  assert.equal(galleryMedia.length, 3)
  assert.deepEqual(refs, [
    '<dry-run only; would upload /media/belly-brawl-01-sumo-dock.jpg>',
    '<dry-run only; would upload /media/belly-brawl-reference-hero.png>',
    '<dry-run only; would upload /media/belly-brawl-concept-placeholder.png>',
  ])
  assert.equal(primaryMedia.image.asset._ref, refs[0])
  const {_key, ...firstGalleryMedia} = galleryMedia[0] as typeof galleryMedia[0] & {_key: string}
  assert.equal(_key, 'gallery-1')
  assert.deepEqual(primaryMedia, firstGalleryMedia)
})

test('schema accepts current projects and homepage selection is determined by the reference', () => {
  assert.match(projectSchemaSource, /value: 'current'/)
  assert.doesNotMatch(projectSchemaSource, /value: 'featured'/)
  assert.doesNotMatch(homePageSchemaSource, /projectType == "featured"/)
  assert.match(projectSchemaSource, /parent\?\.projectType === 'shipped'/)
})

test('Homepage reference arrays disable reference duplication and keep document duplication separate', () => {
  const prototypesBlock = homePageSchemaSource.slice(
    homePageSchemaSource.indexOf("name: 'prototypes'"),
    homePageSchemaSource.indexOf("name: 'shippedWork'"),
  )
  const shippedProjectsBlock = homePageSchemaSource.slice(
    homePageSchemaSource.indexOf("name: 'projects'"),
    homePageSchemaSource.indexOf("name: 'about'"),
  )

  assert.match(prototypesBlock, /disableActions: \['duplicate', 'copy'\]/)
  assert.match(prototypesBlock, /Create new prototypes from the Prototypes list/)
  assert.match(shippedProjectsBlock, /disableActions: \['duplicate', 'copy'\]/)
  assert.match(shippedProjectsBlock, /Create new projects from the Projects list/)
  assert.doesNotMatch(shippedProjectsBlock, /components: \{input:/)
  assert.match(shippedProjectsBlock, /!\(_id in \$selectedIds\)/)
  assert.match(shippedProjectsBlock, /Rule\.required\(\)\.min\(1\)\.unique\(\)/)
  assert.doesNotMatch(shippedProjectsBlock, /\.length\(|\.max\(/)
  assert.match(sanityConfigSource, /createProjectDuplicateAction/)
  assert.match(sanityConfigSource, /context\.schemaType !== 'project'/)
  assert.match(duplicateProjectActionSource, /label: 'Duplicate as new project'/)
  assert.match(duplicateProjectActionSource, /slug: _slug/)
  assert.match(projectSchemaSource, /Changing this does not create a new Project document/)
})

test('requires the displayed project role while retiring the unused dialog-summary field', () => {
  const roleBlock = projectSchemaSource.slice(
    projectSchemaSource.indexOf("name: 'role'"),
    projectSchemaSource.indexOf("name: 'homepageSummary'"),
  )
  const modalBlock = projectSchemaSource.slice(
    projectSchemaSource.indexOf("name: 'modalSummary'"),
    projectSchemaSource.indexOf("name: 'primaryMedia'"),
  )

  assert.match(roleBlock, /Rule\.required\(\)\.max\(80\)/)
  assert.match(modalBlock, /hidden: true/)
  assert.doesNotMatch(modalBlock, /title: 'Project dialog summary'/)
  assert.match(validationSource, /site\.bellyBrawl\.role/)
})

test('does not reuse formulaic shipped homepage copy or emit the retired field', () => {
  assert.equal(projects.length, 5)
  for (const project of projects.filter(({projectType}) => projectType === 'shipped')) {
    assert.equal(Object.hasOwn(project, 'homepageSummary'), false, `${project._id} contains unapproved homepage copy`)
    assert.equal(Object.hasOwn(project, 'modalSummary'), false, `${project._id} contains the retired field`)
  }
  assert.equal(serialized.includes('I worked on'), false)
  assert.equal(serialized.includes('I worked as'), false)
})

test('migrates only the explicitly approved Networked Leap tag and ordered tabs', () => {
  const networked = documents.find(({_id}) => _id === 'prototype-networked-leap-attack')
  const combat = documents.find(({_id}) => _id === 'prototype-combat-readability-test')
  const arena = documents.find(({_id}) => _id === 'prototype-arena-pressure-loop')

  assert.ok(networked)
  assert.ok(combat)
  assert.ok(arena)
  assert.equal(networked.tagLabel, 'Prototype')
  assert.equal(networked.tagColor, 'yellow')
  assert.deepEqual(networked.tabs, [
    {
      _key: 'problem',
      _type: 'prototypeFolderTab',
      label: 'Problem',
      body: 'How can a committed leap stay readable and responsive for the attacker, target, and nearby players in a networked encounter?',
    },
    {
      _key: 'findings',
      _type: 'prototypeFolderTab',
      label: 'Findings',
      items: [
        'A clear launch pause improves readability without making the attack feel slow.',
        'A visible landing target helps players read risk before impact.',
        'Tuning travel and impact separately makes the move easier to balance.',
      ],
    },
  ])
  assert.equal(Object.hasOwn(networked, 'blueprintCtaLabel'), false)
  assert.equal(Object.hasOwn(networked, 'blueprintCtaEnabled'), false)
  assert.equal(Object.hasOwn(networked, 'blueprintUrl'), false)
  assert.deepEqual(Object.keys(combat), ['_id', '_type'])
  assert.deepEqual(Object.keys(arena), ['_id', '_type'])
  assert.equal(serialized.includes('#design-lab'), false)
})

test('does not migrate unreviewed media text or create presentation defaults', () => {
  const mediaValues: Record<string, unknown>[] = []

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!value || typeof value !== 'object') return

    const record = value as Record<string, unknown>
    if (record._type === 'media') mediaValues.push(record)
    Object.values(record).forEach(visit)
  }

  visit(documents)
  assert.equal(mediaValues.length, 13)
  for (const value of mediaValues) {
    assert.equal(Object.hasOwn(value, 'alt'), false)
    assert.equal(Object.hasOwn(value, 'decorative'), false)
    assert.equal(Object.hasOwn(value, 'displayMode'), false)
    assert.equal(Object.hasOwn(value, 'caption'), false)
  }
})

test('displayMode is an optional schema override and remains absent from migration data', () => {
  const displayModeBlock = mediaSchemaSource.slice(
    mediaSchemaSource.indexOf("name: 'displayMode'"),
    mediaSchemaSource.indexOf("name: 'caption'"),
  )

  assert.doesNotMatch(displayModeBlock, /initialValue/)
  assert.doesNotMatch(displayModeBlock, /Rule\.required/)
  assert.equal(serialized.includes('displayMode'), false)
})

test('reports only current migration blockers and keeps optional content non-blocking', () => {
  const paths = requiredEditorialInputs().map(({path}) => path)

  for (const requiredPath of [
    'siteSettings.location',
    'siteSettings.defaultSeo.title',
    'siteSettings.defaultSeo.description',
    'project.belly-brawl.homepageSummary',
    'project.belly-brawl.contributionSummary',
    'project.wyb-the-play-social.homepageSummary',
    'prototype.combat-readability-test',
    'prototype.arena-pressure-loop',
  ]) {
    assert.ok(paths.includes(requiredPath), `${requiredPath} should require explicit input`)
  }

  for (const optionalPath of [
    'siteSettings.portrait.alt',
    'siteSettings.resumeLabel',
    'siteSettings.resumeFile',
    'siteSettings.resumeUrl',
  ]) {
    assert.equal(paths.includes(optionalPath), false, `${optionalPath} must not block migration`)
  }

  assert.equal(paths.some((path) => path.startsWith('project.belly-brawl.primaryMedia.')), false)
  assert.equal(paths.some((path) => path.startsWith('prototype.combat-readability-test.')), false)
  assert.equal(paths.some((path) => path.startsWith('prototype.arena-pressure-loop.')), false)
  assert.equal(paths.some((path) => path.endsWith('.displayMode')), false)
})

test('groups the readiness checklist with only approved status labels', () => {
  const checklist = collectMigrationReadinessChecklist()
  const statuses = new Set([
    'READY',
    'NEEDS INPUT',
    'NEEDS APPROVAL',
    'OPTIONAL / MAY REMAIN EMPTY',
    'REQUIRES REAL CONTENT',
  ])

  assert.deepEqual(checklist.map(({group}) => group), [
    'A. Profile / SEO',
    'B. Belly Brawl',
    'C. Shipped Work',
    'D. Design Lab',
    'E. Media accessibility',
    'F. Optional later content',
  ])
  assert.ok(checklist.every(({items}) => items.every(({status}) => statuses.has(status))))

  const items = checklist.flatMap(({items}) => items)
  const statusFor = (item: string) => items.find((entry) => entry.item === item)?.status
  assert.equal(
    statusFor('siteSettings.resumeLabel, resumeFile and resumeUrl'),
    'OPTIONAL / MAY REMAIN EMPTY',
  )
  assert.equal(
    statusFor('project.belly-brawl.role = Game & Level Design Lead · Technical Design'),
    'READY',
  )
  assert.equal(statusFor('prototype.combat-readability-test'), 'REQUIRES REAL CONTENT')
  assert.equal(statusFor('prototype.arena-pressure-loop'), 'REQUIRES REAL CONTENT')
})

test('has no remaining project-type or display-mode compatibility blocker', () => {
  assert.deepEqual(collectMigrationCompatibilityIssues(), [])
})

test('does not synthesize résumé content or retain the retired dialog-summary data path', () => {
  assert.doesNotMatch(indexSource, /Résumé request/)
  assert.doesNotMatch(indexSource, /\|\| 'Request résumé'/)
  assert.doesNotMatch(indexSource, /modalSummary/)
  assert.doesNotMatch(adapterSource, /modalSummary/)
  assert.doesNotMatch(querySource, /modalSummary/)
  assert.match(indexSource, /hasResumeCta/)
  assert.match(indexSource, /data-project-dialog=\{project\.slug\}/)
  assert.doesNotMatch(indexSource, /data-project-dialog=\{site\.bellyBrawl\.slug\}/)
  assert.match(indexSource, /site\.bellyBrawl\.facts\.map/)
})

test('dry-run preview is explicitly write-free and upload-free', async () => {
  const preview = await buildDryRunPreview()
  assert.equal(preview.mode, 'dry-run')
  assert.equal(preview.writesPerformed, false)
  assert.equal(preview.assetsUploaded, false)
  assert.equal(preview.documentCount, 10)
  assert.equal(preview.bellyBrawlGalleryCount, 3)
  assert.equal(preview.mediaPlacementCount, 14)
  assert.deepEqual(preview.placeholderAssetsStillInUse, [
    '/media/design-lab-gameplay-placeholder.png',
    '/media/belly-brawl-concept-placeholder.png',
  ])
})

test('preview references only media belonging to retained approved placements', () => {
  const assetSources = [...serialized.matchAll(/<dry-run only; would upload ([^>]+)>/g)].map((match) => match[1])
  const sources = collectMigrationMediaSources()

  assert.equal(assetSources.length, 14)
  assert.equal(sources.length, 10)
  assert.ok(assetSources.every((source) => source.startsWith('/media/')))
  assert.equal(assetSources.includes('/media/leap-attack-greybox-placeholder.png'), false)
  assert.deepEqual(sources.filter(({placeholder}) => placeholder).map(({source}) => source), [
    '/media/design-lab-gameplay-placeholder.png',
    '/media/belly-brawl-concept-placeholder.png',
  ])
})

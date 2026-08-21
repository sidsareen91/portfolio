import {
  localHomePagePayload,
  type HomePagePayload,
  type MediaItem,
} from '../../src/content/portfolio'
import {isBlueprintRenderUrl} from '../../src/content/blueprint-url'
import {heroHeadlineToPortableText} from '../../src/content/hero-headline'
import {createHomepageSectionSettings} from '../../src/content/homepage-sections'

export type AssetReference = {_type: 'reference'; _ref: string}
export type ResolveImage = (source: string) => Promise<AssetReference>
export type MigrationDocument = {_id: string; _type: string; [key: string]: unknown}

type BuildMigrationOptions = {
  includeUnapprovedPrototypeDraftContent?: boolean
}

export type EmptyEditorialField = {
  path: string
  requirement: 'required' | 'one-of-required' | 'optional'
  reason: string
}

export type MigrationMediaSource = {
  source: string
  placeholder: boolean
  placements: string[]
}

export type MigrationCompatibilityIssue = {
  path: string
  reason: string
}

export type MigrationReadinessStatus =
  | 'READY'
  | 'NEEDS INPUT'
  | 'NEEDS APPROVAL'
  | 'OPTIONAL / MAY REMAIN EMPTY'
  | 'REQUIRES REAL CONTENT'

export type MigrationReadinessGroup = {
  group:
    | 'A. Profile / SEO'
    | 'B. Belly Brawl'
    | 'C. Shipped Work'
    | 'D. Design Lab'
    | 'E. Media accessibility'
    | 'F. Optional later content'
  items: Array<{item: string; status: MigrationReadinessStatus}>
}

const approvedBellyBrawlRole = 'Game & Level Design Lead · Technical Design'

export function assertMigrationApproved(value: string | undefined) {
  if (value !== 'yes') {
    throw new Error(
      'Migration stopped. Manually verify the initial claims and media, then set SANITY_MIGRATION_APPROVED=yes for this one run.',
    )
  }
}

export function assertDraftSeedApproved(value: string | undefined) {
  if (value !== 'yes') {
    throw new Error(
      'Draft seed stopped. Confirm the target and set SANITY_DRAFT_SEED_APPROVED=yes for this one run.',
    )
  }
}

export function assertDraftSeedTarget(projectId: string | undefined, dataset: string) {
  if (projectId !== '5536cj5d' || dataset !== 'production') {
    throw new Error(
      `Draft seed target must be 5536cj5d/production; received ${projectId || '<missing>'}/${dataset}.`,
    )
  }
}

const reference = (id: string, key?: string) => ({
  ...(key ? {_key: key} : {}),
  _type: 'reference',
  _ref: id,
})

async function imagePlacement(value: MediaItem, resolveImage: ResolveImage) {
  return {
    _type: 'imagePlacement',
    image: {_type: 'image', asset: await resolveImage(value.src)},
  }
}

async function media(value: MediaItem, resolveImage: ResolveImage, key?: string) {
  return {
    ...(key ? {_key: key} : {}),
    _type: 'media',
    kind: 'image',
    image: {_type: 'image', asset: await resolveImage(value.src)},
  }
}

export async function buildMigrationDocuments(
  resolveImage: ResolveImage,
  source: HomePagePayload = localHomePagePayload,
  options: BuildMigrationOptions = {},
): Promise<MigrationDocument[]> {
  const {pageCopy, site} = source
  // Sanity treats IDs containing a period as private sub-paths. Root-path IDs
  // are required so the public Astro client can dereference published records.
  const featuredProjectId = `project-${site.bellyBrawl.slug}`
  const shippedProjectIds = site.shippedWork.map(({slug}) => `project-${slug}`)
  const prototypeIds = site.prototypes.map(({slug}) => `prototype-${slug}`)

  const bellyBrawlGallery = await Promise.all(
    site.bellyBrawl.media.map((item, index) => media(item, resolveImage, `gallery-${index + 1}`)),
  )
  const bellyBrawlPrimaryMedia = {...bellyBrawlGallery[0]}
  delete bellyBrawlPrimaryMedia._key

  const featuredProject: MigrationDocument = {
    _id: featuredProjectId,
    _type: 'project',
    title: site.bellyBrawl.title,
    slug: {_type: 'slug', current: site.bellyBrawl.slug},
    projectType: 'current',
    role: approvedBellyBrawlRole,
    galleryAutoSwitchItems: site.carousels.bellyBrawl.enabled,
    gallerySwitchIntervalSeconds: site.carousels.bellyBrawl.seconds,
    primaryMedia: bellyBrawlPrimaryMedia,
    galleryMedia: bellyBrawlGallery,
  }

  const shippedProjects = await Promise.all(
    site.shippedWork.map(async (project, index): Promise<MigrationDocument> => {
      return {
        _id: shippedProjectIds[index],
        _type: 'project',
        title: project.title,
        slug: {_type: 'slug', current: project.slug},
        projectType: 'shipped',
        role: project.role,
        primaryMedia: await media(project.media, resolveImage),
      }
    }),
  )

  const prototypes = await Promise.all(
    site.prototypes.map(async (prototype, index): Promise<MigrationDocument> => {
      if (
        prototype.slug !== 'networked-leap-attack'
        && !options.includeUnapprovedPrototypeDraftContent
      ) {
        return {_id: prototypeIds[index], _type: 'prototype'}
      }

      return {
        _id: prototypeIds[index],
        _type: 'prototype',
        title: prototype.title,
        slug: {_type: 'slug', current: prototype.slug},
        tagLabel: prototype.tag.label,
        tagColor: prototype.tag.color,
        tabs: prototype.tabs.map((tab, tabIndex) => ({
          _key: tab.key || `tab-${tabIndex + 1}`,
          _type: 'prototypeFolderTab',
          label: tab.label,
          ...(tab.body ? {body: tab.body} : {}),
          ...(tab.items?.length ? {items: tab.items} : {}),
        })),
        primaryMedia: await media(prototype.media, resolveImage),
      }
    }),
  )

  const settingsDocument: MigrationDocument = {
    _id: 'siteSettings',
    _type: 'siteSettings',
    name: site.profile.name,
    role: site.profile.role,
    email: site.profile.email,
    portrait: await imagePlacement(site.profile.portrait, resolveImage),
  }

  const homePageDocument: MigrationDocument = {
    _id: 'homePage',
    _type: 'homePage',
    sectionOrder: createHomepageSectionSettings(site.sectionOrder),
    hero: {
      _type: 'object',
      eyebrow: site.hero.eyebrow,
      headline: heroHeadlineToPortableText(site.hero.headline),
      autoSwitchItems: site.carousels.hero.enabled,
      switchIntervalSeconds: site.carousels.hero.seconds,
      media: await Promise.all(
        site.hero.media.map((item, index) => media(item, resolveImage, `hero-${index + 1}`)),
      ),
    },
    stats: site.stats.map((stat, index) => ({_key: `stat-${index + 1}`, _type: 'stat', ...stat})),
    featuredProjectKicker: pageCopy.featuredProjectKicker,
    featuredProject: reference(featuredProjectId),
    approach: {
      _type: 'object',
      title: pageCopy.approachTitle,
      steps: site.approach.map(({title, description}, index) => ({
        _key: `approach-${index + 1}`,
        _type: 'approachStep',
        title,
        description,
      })),
    },
    designLabTitle: pageCopy.designLabTitle,
    designLabAutoSwitchItems: site.carousels.designLab.enabled,
    designLabSwitchIntervalSeconds: site.carousels.designLab.seconds,
    prototypes: prototypeIds.map((id, index) => reference(id, `prototype-${index + 1}`)),
    shippedWork: {
      _type: 'object',
      kicker: pageCopy.shippedWorkKicker,
      title: pageCopy.shippedWorkTitle,
      projects: shippedProjectIds.map((id, index) => reference(id, `project-${index + 1}`)),
    },
    about: {
      _type: 'object',
      kicker: pageCopy.aboutKicker,
      heading: pageCopy.aboutHeading,
      bio: site.about.bio,
      tags: site.about.tags,
    },
    contact: {
      _type: 'object',
      kicker: pageCopy.contactKicker,
      headline: site.contact.message,
    },
  }

  return [featuredProject, ...shippedProjects, ...prototypes, settingsDocument, homePageDocument]
}

export async function buildDraftSeedDocuments(
  resolveImage: ResolveImage,
  source: HomePagePayload = localHomePagePayload,
): Promise<MigrationDocument[]> {
  const documents = await buildMigrationDocuments(resolveImage, source, {
    includeUnapprovedPrototypeDraftContent: true,
  })

  return documents.map((document) => {
    const draftDocument = {...document, _id: `drafts.${document._id}`}
    if (document._id !== 'homePage') return draftDocument

    const makeUnpublishedReference = (
      value: {_key?: string; _type: 'reference'; _ref: string},
      type: 'project' | 'prototype',
    ) => ({
      ...value,
      _weak: true,
      _strengthenOnPublish: {type},
    })

    return {
      ...draftDocument,
      featuredProject: makeUnpublishedReference(
        document.featuredProject as {_type: 'reference'; _ref: string},
        'project',
      ),
      prototypes: (document.prototypes as Array<{
        _key: string
        _type: 'reference'
        _ref: string
      }>).map((value) => makeUnpublishedReference(value, 'prototype')),
      shippedWork: {
        ...(document.shippedWork as Record<string, unknown>),
        projects: ((document.shippedWork as {projects: Array<{
          _key: string
          _type: 'reference'
          _ref: string
        }>}).projects).map((value) => makeUnpublishedReference(value, 'project')),
      },
    }
  })
}

function mediaEmptyFields(
  path: string,
  accessibilityDefault: 'meaningful' | 'decorative' = 'meaningful',
): EmptyEditorialField[] {
  const fields: EmptyEditorialField[] = []
  const defaultsDecorative = accessibilityDefault === 'decorative'

  fields.push({
    path: `${path}.alt`,
    requirement: defaultsDecorative ? 'optional' : 'one-of-required',
    reason: defaultsDecorative
      ? 'This fixed placement defaults to decorative. Add an approved alt override only when it communicates unique information.'
      : 'The existing alt text is unapproved and requires exact review, unless the placement is explicitly decorative.',
  })
  fields.push(
    {
      path: `${path}.decorative`,
      requirement: defaultsDecorative ? 'optional' : 'one-of-required',
      reason: defaultsDecorative
        ? 'The fixed placement uses the code-owned decorative default when this override is absent.'
        : 'Explicitly mark true only when this placement is decorative; otherwise supply approved alt text.',
    },
    {
      path: `${path}.displayMode`,
      requirement: 'optional',
      reason: 'No editorial override. The approved frontend rendering behavior remains the default.',
    },
    {
      path: `${path}.caption`,
      requirement: 'optional',
      reason: 'No caption is explicitly approved.',
    },
  )

  fields.push(
    {
      path: `${path}.image.crop`,
      requirement: 'optional',
      reason: 'No crop is explicitly approved.',
    },
    {
      path: `${path}.image.hotspot`,
      requirement: 'optional',
      reason: 'No hotspot is explicitly approved.',
    },
  )

  return fields
}

export function collectEmptyEditorialFields(
  source: HomePagePayload = localHomePagePayload,
): EmptyEditorialField[] {
  const {site} = source
  const fields: EmptyEditorialField[] = []
  fields.push(
    {path: 'siteSettings.location', requirement: 'required', reason: 'Existing value is unapproved.'},
    {
      path: 'siteSettings.portrait.alt',
      requirement: 'optional',
      reason: 'Optional manual override. The frontend derives “Portrait of {siteSettings.name}” when absent.',
    },
    {path: 'siteSettings.linkedinUrl', requirement: 'optional', reason: 'To be supplied later through Sanity.'},
    {path: 'siteSettings.discordUrl', requirement: 'optional', reason: 'To be supplied later through Sanity.'},
    {
      path: 'siteSettings.resumeLabel',
      requirement: 'optional',
      reason: 'Résumé content is optional. The frontend hides the CTA when no real destination and label exist.',
    },
    {
      path: 'siteSettings.resumeFile',
      requirement: 'optional',
      reason: 'No approved résumé PDF. This may remain empty without blocking migration.',
    },
    {
      path: 'siteSettings.resumeUrl',
      requirement: 'optional',
      reason: 'No approved résumé URL. This may remain empty without blocking migration.',
    },
    {path: 'siteSettings.siteUrl', requirement: 'optional', reason: 'No approved production URL.'},
    {path: 'siteSettings.defaultSeo.title', requirement: 'required', reason: 'Existing SEO title is unapproved.'},
    {
      path: 'siteSettings.defaultSeo.description',
      requirement: 'required',
      reason: 'Existing SEO description is unapproved.',
    },
    {
      path: 'siteSettings.defaultSeo.socialImage',
      requirement: 'optional',
      reason: 'No approved SEO social image.',
    },
    {
      path: 'siteSettings.portrait.image.crop',
      requirement: 'optional',
      reason: 'No crop is explicitly approved.',
    },
    {
      path: 'siteSettings.portrait.image.hotspot',
      requirement: 'optional',
      reason: 'No hotspot is explicitly approved.',
    },
  )

  site.hero.media.forEach((_, index) => {
    fields.push(...mediaEmptyFields(`homePage.hero.media[${index}]`, 'decorative'))
  })

  fields.push(
    {
      path: `project.${site.bellyBrawl.slug}.homepageSummary`,
      requirement: 'required',
      reason: 'Existing wording is unapproved.',
    },
    {
      path: `project.${site.bellyBrawl.slug}.contributionSummary`,
      requirement: 'required',
      reason: 'Existing wording is unapproved.',
    },
  )
  site.bellyBrawl.media.forEach((_, index) => {
    fields.push(...mediaEmptyFields(`project.${site.bellyBrawl.slug}.galleryMedia[${index}]`, 'decorative'))
  })

  site.shippedWork.forEach((project) => {
    fields.push(
      {
        path: `project.${project.slug}.homepageSummary`,
        requirement: 'required',
        reason: 'Existing formulaic wording is unapproved.',
      },
    )
    fields.push(...mediaEmptyFields(`project.${project.slug}.primaryMedia`, 'decorative'))
  })

  site.prototypes.forEach((prototype) => {
    if (prototype.slug === 'networked-leap-attack') {
      fields.push(...mediaEmptyFields(`prototype.${prototype.slug}.primaryMedia`, 'decorative'))
    } else {
      fields.push({
        path: `prototype.${prototype.slug}`,
        requirement: 'required',
        reason: 'REQUIRES REAL PROTOTYPE CONTENT / EXPLICIT APPROVAL. Generated field-level values are not retained.',
      })
    }
    if (!isBlueprintRenderUrl(prototype.blueprintUrl)) {
      fields.push({
        path: `prototype.${prototype.slug}.blueprintUrl`,
        requirement: 'optional',
        reason: prototype.blueprintUrl
          ? 'The approved source value is not an HTTPS BlueprintUE render URL and is not repurposed.'
          : 'No approved HTTPS BlueprintUE render URL.',
      })
    }
  })

  return fields
}

export function collectMigrationReadinessChecklist(
  source: HomePagePayload = localHomePagePayload,
): MigrationReadinessGroup[] {
  const {site} = source
  const shippedItems = site.shippedWork.flatMap((project) => [
    {
      item: `project.${project.slug}: title, role and primary media association`,
      status: 'READY' as const,
    },
    {
      item: `project.${project.slug}.homepageSummary`,
      status: 'NEEDS APPROVAL' as const,
    },
  ])
  const accessibilityItems = [
    {
      item: 'siteSettings.portrait: optional alt override with canonical-name fallback',
      status: 'READY' as const,
    },
    {
      item: 'Hero, Belly Brawl gallery and shipped covers: code-owned decorative defaults',
      status: 'READY' as const,
    },
    {
      item: 'prototype.networked-leap-attack.primaryMedia: supporting/decorative by default; meaningful accessibility description is opt-in',
      status: 'READY' as const,
    },
  ]

  return [
    {
      group: 'A. Profile / SEO',
      items: [
        {item: 'siteSettings.name, role, email and portrait asset', status: 'READY'},
        {item: 'siteSettings.location', status: 'NEEDS APPROVAL'},
        {item: 'siteSettings.portrait.alt override', status: 'OPTIONAL / MAY REMAIN EMPTY'},
        {item: 'siteSettings.defaultSeo.title', status: 'NEEDS APPROVAL'},
        {item: 'siteSettings.defaultSeo.description', status: 'NEEDS APPROVAL'},
      ],
    },
    {
      group: 'B. Belly Brawl',
      items: [
        {item: 'project.belly-brawl.projectType = current', status: 'READY'},
        {item: 'homePage.featuredProject -> project.belly-brawl', status: 'READY'},
        {
          item: `project.belly-brawl.role = ${approvedBellyBrawlRole}`,
          status: 'READY',
        },
        {item: 'project.belly-brawl.homepageSummary', status: 'NEEDS APPROVAL'},
        {item: 'project.belly-brawl.contributionSummary', status: 'NEEDS APPROVAL'},
        {item: 'project.belly-brawl.galleryMedia[0..2] in current source order', status: 'READY'},
        {
          item: 'project.belly-brawl.primaryMedia reuses galleryMedia[0] asset and media metadata',
          status: 'READY',
        },
        {item: 'View Project Details safe unavailable-content behavior', status: 'READY'},
      ],
    },
    {
      group: 'C. Shipped Work',
      items: shippedItems,
    },
    {
      group: 'D. Design Lab',
      items: [
        {
          item: 'prototype fields: title, slug, tag, ordered folder tabs, media and optional Blueprint controls',
          status: 'READY',
        },
        {
          item: 'prototype.networked-leap-attack: title, slug, approved Prototype tag, Problem/Findings tabs and media association',
          status: 'READY',
        },
        {item: 'prototype.combat-readability-test', status: 'REQUIRES REAL CONTENT'},
        {item: 'prototype.arena-pressure-loop', status: 'REQUIRES REAL CONTENT'},
        {item: 'No media-evidence classification fields', status: 'READY'},
      ],
    },
    {
      group: 'E. Media accessibility',
      items: [
        ...accessibilityItems,
        {
          item: 'project.belly-brawl.primaryMedia accessibility metadata inherited from galleryMedia[0]',
          status: 'READY',
        },
      ],
    },
    {
      group: 'F. Optional later content',
      items: [
        {item: 'siteSettings.resumeLabel, resumeFile and resumeUrl', status: 'OPTIONAL / MAY REMAIN EMPTY'},
        {item: 'siteSettings.linkedinUrl', status: 'OPTIONAL / MAY REMAIN EMPTY'},
        {item: 'siteSettings.discordUrl', status: 'OPTIONAL / MAY REMAIN EMPTY'},
        {item: 'siteSettings.siteUrl', status: 'OPTIONAL / MAY REMAIN EMPTY'},
        {item: 'siteSettings.defaultSeo.socialImage', status: 'OPTIONAL / MAY REMAIN EMPTY'},
        {item: 'prototype blueprintUrl values', status: 'OPTIONAL / MAY REMAIN EMPTY'},
        {
          item: 'media displayMode, captions, crop and hotspot overrides',
          status: 'OPTIONAL / MAY REMAIN EMPTY',
        },
      ],
    },
  ]
}

export const requiredEditorialInputs = (source: HomePagePayload = localHomePagePayload) =>
  collectEmptyEditorialFields(source).filter(({requirement}) => requirement !== 'optional')

export function collectMigrationCompatibilityIssues(): MigrationCompatibilityIssue[] {
  return []
}

export function collectMigrationMediaSources(
  source: HomePagePayload = localHomePagePayload,
  options: {includeAllPrototypeMedia?: boolean} = {},
): MigrationMediaSource[] {
  const {site} = source
  const placements = new Map<string, string[]>()
  const add = (mediaSource: string, placement: string) => {
    const existing = placements.get(mediaSource) ?? []
    existing.push(placement)
    placements.set(mediaSource, existing)
  }

  add(site.profile.portrait.src, 'siteSettings.portrait')
  site.hero.media.forEach((item, index) => add(item.src, `homePage.hero.media[${index}]`))
  add(site.bellyBrawl.media[0].src, `project.${site.bellyBrawl.slug}.primaryMedia`)
  site.bellyBrawl.media.forEach((item, index) => {
    add(item.src, `project.${site.bellyBrawl.slug}.galleryMedia[${index}]`)
  })
  site.shippedWork.forEach((project) => add(project.media.src, `project.${project.slug}.primaryMedia`))
  site.prototypes
    .filter(({slug}) => options.includeAllPrototypeMedia || slug === 'networked-leap-attack')
    .forEach((prototype) => add(prototype.media.src, `prototype.${prototype.slug}.primaryMedia`))

  return [...placements.entries()].map(([mediaSource, sourcePlacements]) => ({
    source: mediaSource,
    placeholder: mediaSource.toLowerCase().includes('placeholder'),
    placements: sourcePlacements,
  }))
}

export const previewImageResolver: ResolveImage = async (source) => ({
  _type: 'reference',
  _ref: `<dry-run only; would upload ${source}>`,
})

export async function buildDryRunPreview() {
  const documents = await buildMigrationDocuments(previewImageResolver)
  const mediaSources = collectMigrationMediaSources()

  return {
    mode: 'dry-run',
    source: 'src/content/portfolio.ts',
    writesPerformed: false,
    assetsUploaded: false,
    documentCount: documents.length,
    bellyBrawlGalleryCount: localHomePagePayload.site.bellyBrawl.media.length,
    mediaPlacementCount: mediaSources.reduce((total, item) => total + item.placements.length, 0),
    placeholderAssetsStillInUse: mediaSources.filter(({placeholder}) => placeholder).map(({source}) => source),
    explicitlyApprovedContent: documents,
    migrationReadinessChecklist: collectMigrationReadinessChecklist(),
    schemaCompatibilityIssues: collectMigrationCompatibilityIssues(),
    mediaSources,
  }
}

export async function buildDraftSeedPreview() {
  const documents = await buildDraftSeedDocuments(previewImageResolver)
  const mediaSources = collectMigrationMediaSources(localHomePagePayload, {
    includeAllPrototypeMedia: true,
  })
  const emptyOrUnapprovedFields = collectEmptyEditorialFields()

  return {
    mode: 'draft-seed-dry-run',
    target: {projectId: '5536cj5d', dataset: 'production'},
    source: 'src/content/portfolio.ts',
    writesPerformed: false,
    assetsUploaded: false,
    draftDocumentCount: documents.length,
    publishedDocumentCount: 0,
    draftDocumentIds: documents.map(({_id}) => _id),
    publishedDocumentIds: [] as string[],
    bellyBrawlGalleryCount: localHomePagePayload.site.bellyBrawl.media.length,
    mediaPlacementCount: mediaSources.reduce((total, item) => total + item.placements.length, 0),
    uniqueAssetsToUpload: mediaSources.length,
    assetsToUpload: mediaSources,
    placeholderAssetsIncluded: mediaSources
      .filter(({placeholder}) => placeholder)
      .map(({source}) => source),
    emptyOrUnapprovedFields,
    draftDocuments: documents,
    schemaCompatibilityIssues: collectMigrationCompatibilityIssues(),
  }
}

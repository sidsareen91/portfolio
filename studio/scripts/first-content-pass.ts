import {getCliClient} from 'sanity/cli'
import {createClient} from '@sanity/client'
import {HOME_PAGE_QUERY} from '../../src/cms/query'

const PROJECT_ID = '5536cj5d'
const DATASET = 'production'
const API_VERSION = '2026-08-11'

const projectIds = [
  'project.belly-brawl',
  'project.wyb-the-play-social',
  'project.early-learn',
  'project.kitchen-story',
  'project.world-of-cricket',
] as const

const prototypeIds = [
  'prototype.networked-leap-attack',
  'prototype.combat-readability-test',
  'prototype.arena-pressure-loop',
] as const

const dependencyIds = [...projectIds, ...prototypeIds]
const publicProjectIds = projectIds.map((id) => id.replace('.', '-'))
const publicPrototypeIds = prototypeIds.map((id) => id.replace('.', '-'))
const publicDependencyIds = [...publicProjectIds, ...publicPrototypeIds]
const publicIdByPrivateId = new Map(dependencyIds.map((id, index) => [id, publicDependencyIds[index]]))
const draftId = (id: string) => `drafts.${id}`
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

type DocumentValue = {
  _id: string
  _type: string
  _rev?: string
  [key: string]: unknown
}

type MediaValue = {
  _type?: string
  kind?: string
  image?: {asset?: {_ref?: string}}
  decorative?: boolean
  alt?: string
}

const client = getCliClient({apiVersion: API_VERSION}).withConfig({
  projectId: PROJECT_ID,
  dataset: DATASET,
  perspective: 'raw',
  useCdn: false,
})

function assertTarget() {
  const config = client.config()
  if (config.projectId !== PROJECT_ID || config.dataset !== DATASET) {
    throw new Error(`Refusing non-approved target ${config.projectId}/${config.dataset}.`)
  }
}

function assetRef(media: unknown): string | undefined {
  return (media as MediaValue | undefined)?.image?.asset?._ref
}

function referenceId(value: unknown): string | undefined {
  return value && typeof value === 'object'
    ? ((value as {_ref?: unknown})._ref as string | undefined)
    : undefined
}

function tabPlaceholder(tab: unknown, prototypeName: string, index: number) {
  const value = (tab && typeof tab === 'object' ? tab : {}) as Record<string, unknown>
  const label = isText(value.label) ? value.label.trim() : `Tab ${index + 1}`
  const placeholder = `PLACEHOLDER — Final ${prototypeName} ${label} content needed`
  const base = {
    _key: isText(value._key) ? value._key : `tab-${index + 1}`,
    _type: 'prototypeFolderTab',
    label,
  }
  return Array.isArray(value.items) && value.items.length > 0
    ? {...base, items: [placeholder]}
    : {...base, body: placeholder}
}

async function getDocuments(ids: readonly string[]) {
  const documents = await client.getDocuments<DocumentValue>([...ids])
  return new Map(ids.map((id, index) => [id, documents[index] ?? null]))
}

async function snapshot() {
  assertTarget()
  const ids = [
    'siteSettings',
    'homePage',
    draftId('homePage'),
    ...dependencyIds.flatMap((id) => [id, draftId(id)]),
  ]
  const documents = await getDocuments(ids)
  const settings = documents.get('siteSettings')
  const homepageDraft = documents.get(draftId('homePage'))

  const result = {
    target: `${PROJECT_ID}/${DATASET}`,
    publishedSiteSettings: Boolean(settings),
    siteSettingsRevision: settings?._rev,
    publishedDependencies: dependencyIds.filter((id) => documents.get(id)),
    draftDependencies: dependencyIds.filter((id) => documents.get(draftId(id))),
    homepagePublished: Boolean(documents.get('homePage')),
    homepageDraft: Boolean(homepageDraft),
    homepageReferences: homepageDraft && {
      featuredProject: referenceId(homepageDraft.featuredProject),
      prototypes: ((homepageDraft.prototypes as unknown[] | undefined) ?? []).map(referenceId),
      shippedWork: (((homepageDraft.shippedWork as {projects?: unknown[]} | undefined)?.projects) ?? [])
        .map(referenceId),
    },
    projectDrafts: projectIds.map((id) => {
      const document = documents.get(draftId(id))
      return {
        id,
        exists: Boolean(document),
        title: document?.title,
        projectType: document?.projectType,
        role: document?.role,
        homepageSummary: document?.homepageSummary,
        contributionSummary: document?.contributionSummary,
        primaryAsset: assetRef(document?.primaryMedia),
        galleryAssets: ((document?.galleryMedia as unknown[] | undefined) ?? []).map(assetRef),
      }
    }),
    prototypeDrafts: prototypeIds.map((id) => {
      const document = documents.get(draftId(id))
      return {
        id,
        exists: Boolean(document),
        title: document?.title,
        slug: (document?.slug as {current?: string} | undefined)?.current,
        tagLabel: document?.tagLabel,
        tagColor: document?.tagColor,
        tabs: document?.tabs,
        primaryAsset: assetRef(document?.primaryMedia),
        decorative: (document?.primaryMedia as MediaValue | undefined)?.decorative,
        alt: (document?.primaryMedia as MediaValue | undefined)?.alt,
        blueprintUrl: document?.blueprintUrl,
        blueprintCtaEnabled: document?.blueprintCtaEnabled,
        blueprintCtaLabel: document?.blueprintCtaLabel,
      }
    }),
  }
  console.log(JSON.stringify(result, null, 2))
}

async function prepare() {
  assertTarget()
  const ids = ['siteSettings', draftId('homePage'), ...dependencyIds.map(draftId)]
  const documents = await getDocuments(ids)
  if (!documents.get('siteSettings')) throw new Error('Published siteSettings is required and will not be modified.')
  if (!documents.get(draftId('homePage'))) throw new Error('The Homepage draft is missing.')

  const projectDrafts = new Map(projectIds.map((id) => [id, documents.get(draftId(id))]))
  for (const [id, document] of projectDrafts) {
    if (!document || document._type !== 'project' || !document._rev) {
      throw new Error(`Required project draft ${id} is missing or invalid.`)
    }
  }

  const belly = projectDrafts.get('project.belly-brawl')!
  const bellyGallery = (belly.galleryMedia as unknown[] | undefined) ?? []
  if (belly.projectType !== 'current') throw new Error('Belly Brawl must remain projectType=current.')
  if (belly.role !== 'Game & Level Design Lead · Technical Design') {
    throw new Error('Belly Brawl role differs from the explicitly approved value.')
  }
  if (bellyGallery.length !== 3) throw new Error('Belly Brawl gallery must contain exactly three items.')
  if (!assetRef(belly.primaryMedia) || assetRef(belly.primaryMedia) !== assetRef(bellyGallery[0])) {
    throw new Error('Belly Brawl primaryMedia must reuse galleryMedia[0].')
  }

  const networked = documents.get(draftId('prototype.networked-leap-attack'))
  const arena = documents.get(draftId('prototype.arena-pressure-loop'))
  const combat = documents.get(draftId('prototype.combat-readability-test'))
  if (!networked?._rev || !arena?._rev) {
    throw new Error('Networked Leap Attack and Arena prototype drafts must exist before preparation.')
  }
  if (!assetRef(networked.primaryMedia) || !assetRef(arena.primaryMedia)) {
    throw new Error('Existing Networked and Arena media must remain available.')
  }
  if (combat && !String(combat.title ?? '').startsWith('PLACEHOLDER —')) {
    throw new Error('Combat Readability Test now contains non-placeholder content; review it manually before continuing.')
  }

  let transaction = client.transaction()
  const projectPlaceholders: Record<(typeof projectIds)[number], string> = {
    'project.belly-brawl': 'PLACEHOLDER — Final Belly Brawl game description needed',
    'project.wyb-the-play-social': 'PLACEHOLDER — Final Wyb homepage summary needed',
    'project.early-learn': 'PLACEHOLDER — Final Early Learn homepage summary needed',
    'project.kitchen-story': 'PLACEHOLDER — Final Kitchen Story homepage summary needed',
    'project.world-of-cricket': 'PLACEHOLDER — Final World of Cricket homepage summary needed',
  }

  for (const id of projectIds) {
    const document = projectDrafts.get(id)!
    const setValues: Record<string, unknown> = {}
    if (!isText(document.homepageSummary)) setValues.homepageSummary = projectPlaceholders[id]
    if (id === 'project.belly-brawl' && !isText(document.contributionSummary)) {
      setValues.contributionSummary = 'PLACEHOLDER — Final Belly Brawl contribution summary needed'
    }
    let patch = client.patch(document._id).ifRevisionId(document._rev!)
    if (Object.keys(setValues).length) patch = patch.set(setValues)
    transaction = transaction.patch(patch)
  }

  const networkedTabs = ((networked.tabs as unknown[] | undefined) ?? []).map((tab, index) =>
    tabPlaceholder(tab, 'Networked Leap Attack', index),
  )
  if (networkedTabs.length < 1) throw new Error('Networked Leap Attack must retain at least one folder tab.')
  transaction = transaction.patch(
    client.patch(networked._id).ifRevisionId(networked._rev).set({tabs: networkedTabs}),
  )

  transaction = transaction.patch(
    client.patch(arena._id).ifRevisionId(arena._rev).set({
      title: 'PLACEHOLDER — Prototype 3',
      slug: {_type: 'slug', current: 'placeholder-prototype-3'},
      tagLabel: 'Prototype',
      tagColor: 'yellow',
      tabs: [{
        _key: 'placeholder',
        _type: 'prototypeFolderTab',
        label: 'Placeholder',
        body: 'PLACEHOLDER — Real Design Lab prototype content needed',
      }],
    }).unset(['blueprintUrl', 'blueprintCtaEnabled', 'blueprintCtaLabel']),
  )

  const existingTemporaryAsset = await client.fetch<{_id?: string} | null>(
    '*[_type == "sanity.imageAsset" && originalFilename == "leap-attack-greybox-placeholder.png"][0]{_id}',
  )
  const combatAsset = existingTemporaryAsset?._id ?? assetRef(arena.primaryMedia)
  if (!combatAsset) throw new Error('No existing temporary media asset is available for Prototype 2.')
  const combatDocument = {
    _id: draftId('prototype.combat-readability-test'),
    _type: 'prototype',
    title: 'PLACEHOLDER — Prototype 2',
    slug: {_type: 'slug', current: 'placeholder-prototype-2'},
    tagLabel: 'Prototype',
    tagColor: 'yellow',
    tabs: [{
      _key: 'placeholder',
      _type: 'prototypeFolderTab',
      label: 'Placeholder',
      body: 'PLACEHOLDER — Real Design Lab prototype content needed',
    }],
    primaryMedia: {
      _type: 'media',
      kind: 'image',
      image: {_type: 'image', asset: {_type: 'reference', _ref: combatAsset}},
    },
  }
  transaction = combat
    ? transaction.createOrReplace(combatDocument)
    : transaction.create(combatDocument)

  const result = await transaction.commit({tag: 'portfolio.first-content-pass.prepare'})
  console.log(JSON.stringify({preparedDrafts: result.results.map(({id}) => id), writes: result.results.length}, null, 2))
}

async function publishDependencies() {
  assertTarget()
  const documents = await getDocuments(dependencyIds.flatMap((id) => [id, draftId(id)]))
  for (const id of dependencyIds) {
    const published = documents.get(id)
    const draft = documents.get(draftId(id))
    if (published && !draft) continue
    if (!draft?._rev) throw new Error(`Cannot publish missing draft ${draftId(id)}.`)
    await client.action({
      actionType: 'sanity.action.document.publish',
      draftId: draft._id,
      publishedId: id,
      ifDraftRevisionId: draft._rev,
      ...(published?._rev ? {ifPublishedRevisionId: published._rev} : {}),
    }, {tag: 'portfolio.first-content-pass.publish-dependency'})
    console.log(`Published ${id}`)
  }
}

async function publishHomepage() {
  assertTarget()
  const documents = await getDocuments([
    'siteSettings',
    'homePage',
    draftId('homePage'),
    ...dependencyIds,
  ])
  if (!documents.get('siteSettings')) throw new Error('Published siteSettings is missing.')
  const homepage = documents.get(draftId('homePage'))
  if (!homepage?._rev) throw new Error('Homepage draft is missing.')
  for (const id of dependencyIds) {
    if (!documents.get(id)) throw new Error(`Homepage dependency ${id} is not published.`)
  }

  const prototypeReferences = ((homepage.prototypes as unknown[] | undefined) ?? []).map(referenceId)
  const shippedReferences = (((homepage.shippedWork as {projects?: unknown[]} | undefined)?.projects) ?? [])
    .map(referenceId)
  if (referenceId(homepage.featuredProject) !== projectIds[0]) {
    throw new Error('Homepage featuredProject no longer references Belly Brawl.')
  }
  if (JSON.stringify(prototypeReferences) !== JSON.stringify(prototypeIds)) {
    throw new Error(`Homepage prototype order differs: ${JSON.stringify(prototypeReferences)}.`)
  }
  if (JSON.stringify(shippedReferences) !== JSON.stringify(projectIds.slice(1))) {
    throw new Error(`Homepage shipped-project order differs: ${JSON.stringify(shippedReferences)}.`)
  }

  const published = documents.get('homePage')
  await client.action({
    actionType: 'sanity.action.document.publish',
    draftId: homepage._id,
    publishedId: 'homePage',
    ifDraftRevisionId: homepage._rev,
    ...(published?._rev ? {ifPublishedRevisionId: published._rev} : {}),
  }, {tag: 'portfolio.first-content-pass.publish-homepage'})
  console.log('Published homePage')
}

function copyAsDraft(document: DocumentValue, publishedId: string): DocumentValue {
  const {_rev, _createdAt, _updatedAt, ...content} = document
  return {...content, _id: draftId(publishedId)}
}

function publicReference(reference: unknown, publishedId: string) {
  const value = reference && typeof reference === 'object'
    ? reference as Record<string, unknown>
    : {}
  return {
    ...value,
    _type: 'reference',
    _ref: publishedId,
    _weak: true,
    _strengthenOnPublish: {type: publishedId.startsWith('project-') ? 'project' : 'prototype'},
  }
}

async function preparePublicIds() {
  assertTarget()
  const documents = await getDocuments([
    'homePage',
    draftId('homePage'),
    ...dependencyIds,
    ...publicDependencyIds,
    ...publicDependencyIds.map(draftId),
  ])
  const homepage = documents.get('homePage')
  if (!homepage) throw new Error('Published Homepage is required before the public-ID repair.')
  if (documents.get(draftId('homePage'))) throw new Error('Homepage has new draft edits; review them before ID repair.')

  let transaction = client.transaction()
  for (const privateId of dependencyIds) {
    const publicId = publicIdByPrivateId.get(privateId)!
    const source = documents.get(privateId)
    if (!source) throw new Error(`Missing private-path source document ${privateId}.`)
    if (documents.get(publicId) || documents.get(draftId(publicId))) {
      throw new Error(`Public-root target ${publicId} already exists; stopping to avoid overwriting it.`)
    }
    transaction = transaction.create(copyAsDraft(source, publicId))
  }

  const homepageDraft = copyAsDraft(homepage, 'homePage')
  homepageDraft.featuredProject = publicReference(
    homepage.featuredProject,
    publicProjectIds[0],
  )
  homepageDraft.prototypes = ((homepage.prototypes as unknown[] | undefined) ?? []).map(
    (reference, index) => publicReference(reference, publicPrototypeIds[index]),
  )
  homepageDraft.shippedWork = {
    ...(homepage.shippedWork as Record<string, unknown> | undefined),
    projects: (((homepage.shippedWork as {projects?: unknown[]} | undefined)?.projects) ?? []).map(
      (reference, index) => publicReference(reference, publicProjectIds[index + 1]),
    ),
  }
  transaction = transaction.create(homepageDraft)

  const result = await transaction.commit({tag: 'portfolio.first-content-pass.prepare-public-ids'})
  console.log(JSON.stringify({preparedPublicDrafts: result.results.map(({id}) => id)}, null, 2))
}

async function publishPublicDependencies() {
  assertTarget()
  const documents = await getDocuments(publicDependencyIds.flatMap((id) => [id, draftId(id)]))
  for (const id of publicDependencyIds) {
    const published = documents.get(id)
    const draft = documents.get(draftId(id))
    if (published && !draft) continue
    if (!draft?._rev) throw new Error(`Cannot publish missing public-root draft ${draftId(id)}.`)
    await client.action({
      actionType: 'sanity.action.document.publish',
      draftId: draft._id,
      publishedId: id,
      ifDraftRevisionId: draft._rev,
      ...(published?._rev ? {ifPublishedRevisionId: published._rev} : {}),
    }, {tag: 'portfolio.first-content-pass.publish-public-dependency'})
    console.log(`Published ${id}`)
  }
}

async function publishPublicHomepage() {
  assertTarget()
  const documents = await getDocuments(['homePage', draftId('homePage'), ...publicDependencyIds])
  const homepage = documents.get(draftId('homePage'))
  const published = documents.get('homePage')
  if (!homepage?._rev || !published?._rev) throw new Error('Homepage publish pair is incomplete.')
  for (const id of publicDependencyIds) {
    if (!documents.get(id)) throw new Error(`Public Homepage dependency ${id} is not published.`)
  }
  const prototypes = ((homepage.prototypes as unknown[] | undefined) ?? []).map(referenceId)
  const shipped = (((homepage.shippedWork as {projects?: unknown[]} | undefined)?.projects) ?? [])
    .map(referenceId)
  if (referenceId(homepage.featuredProject) !== publicProjectIds[0]
    || JSON.stringify(prototypes) !== JSON.stringify(publicPrototypeIds)
    || JSON.stringify(shipped) !== JSON.stringify(publicProjectIds.slice(1))) {
    throw new Error('Homepage public-root reference order is invalid.')
  }
  await client.action({
    actionType: 'sanity.action.document.publish',
    draftId: homepage._id,
    publishedId: 'homePage',
    ifDraftRevisionId: homepage._rev,
    ifPublishedRevisionId: published._rev,
  }, {tag: 'portfolio.first-content-pass.publish-public-homepage'})
  console.log('Published homePage with public-root references')
}

async function removePrivatePathCopies() {
  assertTarget()
  const anonymousClient = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    useCdn: false,
    perspective: 'published',
  })
  const visible = await anonymousClient.fetch<Array<{_id: string}>>(
    '*[_type in ["siteSettings", "homePage", "project", "prototype"]]{_id}',
  )
  const visibleIds = new Set(visible.map(({_id}) => _id))
  for (const id of ['siteSettings', 'homePage', ...publicDependencyIds]) {
    if (!visibleIds.has(id)) throw new Error(`Refusing cleanup because ${id} is not anonymously visible.`)
  }
  const homepage = await anonymousClient.getDocument<DocumentValue>('homePage')
  const refs = [
    referenceId(homepage?.featuredProject),
    ...((homepage?.prototypes as unknown[] | undefined) ?? []).map(referenceId),
    ...((((homepage?.shippedWork as {projects?: unknown[]} | undefined)?.projects) ?? []).map(referenceId)),
  ]
  if (JSON.stringify(refs) !== JSON.stringify([
    publicProjectIds[0],
    ...publicPrototypeIds,
    ...publicProjectIds.slice(1),
  ])) {
    throw new Error('Refusing cleanup because Homepage does not exclusively reference public-root records.')
  }

  let transaction = client.transaction()
  for (const id of dependencyIds) transaction = transaction.delete(id)
  const result = await transaction.commit({tag: 'portfolio.first-content-pass.remove-private-path-copies'})
  console.log(JSON.stringify({removedPrivatePathCopies: result.results.map(({id}) => id)}, null, 2))
}

function collectPlaceholders(value: unknown, path: string, output: Array<{path: string; value: string}>) {
  if (typeof value === 'string') {
    if (value.startsWith('PLACEHOLDER —')) output.push({path, value})
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPlaceholders(item, `${path}[${index}]`, output))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, item] of Object.entries(value)) {
    if (!key.startsWith('_')) collectPlaceholders(item, path ? `${path}.${key}` : key, output)
  }
}

async function verify() {
  assertTarget()
  const publishedClient = client.withConfig({perspective: 'published'})
  const documents = await publishedClient.getDocuments<DocumentValue>([
    'siteSettings',
    'homePage',
    ...publicDependencyIds,
  ])
  const drafts = await getDocuments(['siteSettings', 'homePage', ...publicDependencyIds].map(draftId))
  const missing = documents
    .map((document, index) => document ? null : ['siteSettings', 'homePage', ...publicDependencyIds][index])
    .filter(Boolean)
  if (missing.length) throw new Error(`Missing published documents: ${missing.join(', ')}`)

  const byId = new Map(documents.map((document) => [document!._id, document!]))
  const homepage = byId.get('homePage')!
  const belly = byId.get(publicProjectIds[0])!
  const allReferences = [
    referenceId(homepage.featuredProject),
    ...((homepage.prototypes as unknown[] | undefined) ?? []).map(referenceId),
    ...((((homepage.shippedWork as {projects?: unknown[]} | undefined)?.projects) ?? []).map(referenceId)),
  ]
  const unresolvedReferences = allReferences.filter((id) => !id || !byId.has(id))

  const placeholders: Array<{path: string; value: string}> = []
  for (const document of documents) collectPlaceholders(document, document!._id, placeholders)

  const placements: Array<{path: string; assetId?: string}> = []
  const addPlacement = (path: string, media: unknown) => placements.push({path, assetId: assetRef(media)})
  addPlacement('siteSettings.portrait', {
    image: (byId.get('siteSettings')!.portrait as {image?: unknown} | undefined)?.image,
  })
  const heroMedia = ((homepage.hero as {media?: unknown[]} | undefined)?.media) ?? []
  heroMedia.forEach((media, index) => addPlacement(`homePage.hero.media[${index}]`, media))
  for (const id of publicProjectIds) {
    const project = byId.get(id)!
    addPlacement(`${id}.primaryMedia`, project.primaryMedia)
    ;((project.galleryMedia as unknown[] | undefined) ?? []).forEach((media, index) =>
      addPlacement(`${id}.galleryMedia[${index}]`, media),
    )
  }
  for (const id of publicPrototypeIds) addPlacement(`${id}.primaryMedia`, byId.get(id)!.primaryMedia)

  const uniqueAssetIds = [...new Set(placements.map(({assetId}) => assetId).filter(isText))]
  const assetDocuments = await publishedClient.getDocuments<DocumentValue>(uniqueAssetIds)
  const assetsById = new Map(assetDocuments.filter(Boolean).map((asset) => [asset!._id, asset!]))
  const mediaRefs = placements.map(({path, assetId}) => ({
    path,
    assetId: assetId ?? null,
    resolves: Boolean(assetId && assetsById.has(assetId)),
    originalFilename: assetId
      ? (assetsById.get(assetId)?.originalFilename as string | undefined) ?? null
      : null,
  }))

  const result = {
    target: `${PROJECT_ID}/${DATASET}`,
    publishedDocuments: documents.map((document) => document!._id),
    publishedCount: documents.length,
    remainingDrafts: [...drafts.entries()].filter(([, document]) => document).map(([id]) => id),
    homepageReferenceIds: allReferences,
    unresolvedReferences,
    bellyBrawl: {
      projectType: belly.projectType,
      role: belly.role,
      galleryCount: ((belly.galleryMedia as unknown[] | undefined) ?? []).length,
      galleryAssets: ((belly.galleryMedia as unknown[] | undefined) ?? []).map(assetRef),
      primaryAsset: assetRef(belly.primaryMedia),
      primaryMatchesFirstGalleryItem: assetRef(belly.primaryMedia)
        === assetRef(((belly.galleryMedia as unknown[] | undefined) ?? [])[0]),
    },
    prototypes: publicPrototypeIds.map((id) => {
      const document = byId.get(id)!
      return {
        id,
        title: document.title,
        slug: (document.slug as {current?: string} | undefined)?.current,
        tagLabel: document.tagLabel,
        tagColor: document.tagColor,
        tabCount: ((document.tabs as unknown[] | undefined) ?? []).length,
        decorative: (document.primaryMedia as MediaValue | undefined)?.decorative,
        alt: (document.primaryMedia as MediaValue | undefined)?.alt,
        blueprintUrl: document.blueprintUrl,
        blueprintCtaEnabled: document.blueprintCtaEnabled,
        blueprintCtaLabel: document.blueprintCtaLabel,
      }
    }),
    placeholders,
    mediaReferences: mediaRefs,
    optionalFields: {
      linkedinUrl: byId.get('siteSettings')!.linkedinUrl ?? null,
      discordUrl: byId.get('siteSettings')!.discordUrl ?? null,
      resumeLabel: byId.get('siteSettings')!.resumeLabel ?? null,
      resumeFile: byId.get('siteSettings')!.resumeFile ?? null,
      resumeUrl: byId.get('siteSettings')!.resumeUrl ?? null,
      siteUrl: byId.get('siteSettings')!.siteUrl ?? null,
      defaultSocialImage: (byId.get('siteSettings')!.defaultSeo as {socialImage?: unknown} | undefined)?.socialImage ?? null,
    },
  }
  console.log(JSON.stringify(result, null, 2))
}

async function checkAstroQuery() {
  const anonymousClient = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    useCdn: false,
    perspective: 'published',
  })
  const anonymousRawClient = anonymousClient.withConfig({perspective: 'raw'})
  const exact = await anonymousClient.fetch<Record<string, any>>(HOME_PAGE_QUERY)
  const short = await anonymousClient.fetch<Record<string, any>>(`{
    "featured": *[_id == "homePage"][0].featuredProject->{_id,title},
    "prototypes": *[_id == "homePage"][0].prototypes[]->{_id,title},
    "shipped": *[_id == "homePage"][0].shippedWork.projects[]->{_id,title}
  }`)
  const visibleDocuments = await anonymousClient.fetch<Array<{_id: string; _type: string; title?: string}>>(
    '*[_type in ["siteSettings", "homePage", "project", "prototype"]]{_id,_type,title}',
  )
  const rawVisibleDocuments = await anonymousRawClient.fetch<Array<{_id: string; _type: string; title?: string}>>(
    '*[_type in ["siteSettings", "homePage", "project", "prototype"]]{_id,_type,title}',
  )
  console.log(JSON.stringify({
    queryLength: HOME_PAGE_QUERY.length,
    exact: {
      featured: exact.page?.featuredProject ?? null,
      prototypes: exact.page?.prototypes ?? null,
      shipped: exact.page?.shippedWork?.projects ?? null,
    },
    short,
    visibleDocuments,
    rawVisibleDocuments,
  }, null, 2))
}

const modes = [
  ['--snapshot', snapshot],
  ['--prepare', prepare],
  ['--publish-dependencies', publishDependencies],
  ['--publish-homepage', publishHomepage],
  ['--prepare-public-ids', preparePublicIds],
  ['--publish-public-dependencies', publishPublicDependencies],
  ['--publish-public-homepage', publishPublicHomepage],
  ['--remove-private-path-copies', removePrivatePathCopies],
  ['--verify', verify],
  ['--check-astro-query', checkAstroQuery],
] as const

const selected = modes.filter(([flag]) => process.argv.includes(flag))
if (selected.length !== 1) {
  throw new Error(`Choose exactly one mode: ${modes.map(([flag]) => flag).join(', ')}`)
}
const [flag, run] = selected[0]
const writeMode = flag === '--prepare'
  || flag === '--prepare-public-ids'
  || flag === '--remove-private-path-copies'
  || flag.startsWith('--publish-')
if (writeMode && !process.argv.includes('--execute')) {
  throw new Error(`${flag} is write-capable and requires the explicit --execute flag.`)
}

await run()

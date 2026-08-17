import {getCliClient} from 'sanity/cli'
import {
  heroHeadlineText,
  migrateLegacyHeroHeadline,
  normalizeHeroHeadline,
} from '../../src/content/hero-headline'

const expectedLegacyHeadline = [
  'I design',
  'playable systems',
  'then prove them',
  'in‑engine.',
]

const applyChanges = process.argv.includes('--apply')
if (applyChanges && process.env.HERO_HEADLINE_MIGRATION_APPROVED !== 'yes') {
  throw new Error('Set HERO_HEADLINE_MIGRATION_APPROVED=yes for this headline-only migration run.')
}

const client = getCliClient({apiVersion: '2026-08-12'})
const {projectId, dataset} = client.config()
if (projectId !== '5536cj5d' || dataset !== 'production') {
  throw new Error(`Hero headline migration target must be 5536cj5d/production; received ${projectId}/${dataset}.`)
}
const documentIds = ['homePage', 'drafts.homePage']
const documents = (await Promise.all(documentIds.map((id) => client.getDocument(id))))
  .filter((document): document is NonNullable<typeof document> => Boolean(document))

if (!documents.some(({_id}) => _id === 'homePage')) {
  throw new Error('Published homePage was not found; no migration was performed.')
}

const pending = documents.filter((document) => {
  const headline = (document.hero as {headline?: unknown} | undefined)?.headline
  if (!Array.isArray(headline)) throw new Error(`${document._id}.hero.headline is missing.`)
  if (!headline.every((item) => typeof item === 'string')) {
    const accentText = normalizeHeroHeadline(headline)
      .filter(({accent}) => accent)
      .map(({text}) => text)
      .join('')
      .trim()
    if (
      heroHeadlineText(headline) !== expectedLegacyHeadline.join(' ')
      || accentText !== 'playable systems'
    ) {
      throw new Error(`${document._id}.hero.headline is neither the expected legacy value nor the migrated value.`)
    }
    return false
  }
  if (JSON.stringify(headline) !== JSON.stringify(expectedLegacyHeadline)) {
    throw new Error(`${document._id}.hero.headline changed since verification; no migration was performed.`)
  }
  return true
})

const migratedHeadline = migrateLegacyHeroHeadline(expectedLegacyHeadline)
console.log(JSON.stringify({
  mode: applyChanges ? 'apply' : 'preview',
  target: `${projectId}/${dataset}`,
  documentIds: documents.map(({_id}) => _id),
  documentsToPatch: pending.map(({_id}) => _id),
  text: heroHeadlineText(migratedHeadline),
  accent: 'playable systems',
}, null, 2))

if (applyChanges && pending.length) {
  let transaction = client.transaction()
  for (const document of pending) {
    transaction = transaction.patch(document._id, (patch) => patch
      .ifRevisionId(document._rev)
      .set({'hero.headline': migratedHeadline}))
  }
  await transaction.commit()
  console.log(`Migrated hero.headline on ${pending.length} document(s).`)
}

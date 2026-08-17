import {localHomePagePayload} from '../../src/content/portfolio'
import {
  assertMigrationApproved,
  assertDraftSeedApproved,
  assertDraftSeedTarget,
  buildDraftSeedDocuments,
  buildDraftSeedPreview,
  buildDryRunPreview,
  buildMigrationDocuments,
  collectMigrationCompatibilityIssues,
  requiredEditorialInputs,
  type AssetReference,
} from './migration-documents'

try {
  process.loadEnvFile?.()
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

const isDryRun = process.argv.includes('--dry-run')
const isDraftSeed = process.argv.includes('--draft-seed')

const targetProjectId = () =>
  process.env.SANITY_STUDIO_PROJECT_ID || process.env.PUBLIC_SANITY_PROJECT_ID
const targetDataset = () =>
  process.env.SANITY_STUDIO_DATASET || process.env.PUBLIC_SANITY_DATASET || 'production'

async function preview() {
  if (isDraftSeed) assertDraftSeedTarget(targetProjectId(), targetDataset())
  const result = isDraftSeed ? await buildDraftSeedPreview() : await buildDryRunPreview()
  console.log(JSON.stringify(result, null, 2))
}

async function migrate() {
  if (isDraftSeed) {
    assertDraftSeedApproved(process.env.SANITY_DRAFT_SEED_APPROVED)
  } else {
    assertMigrationApproved(process.env.SANITY_MIGRATION_APPROVED)
  }

  const missingRequiredInputs = isDraftSeed ? [] : requiredEditorialInputs()
  if (missingRequiredInputs.length > 0) {
    const missingPaths = missingRequiredInputs.map(({path}) => `- ${path}`).join('\n')
    throw new Error(
      `Migration stopped before asset upload. Supply explicitly approved values for:\n${missingPaths}`,
    )
  }

  const compatibilityIssues = collectMigrationCompatibilityIssues()
  if (compatibilityIssues.length > 0) {
    const issuePaths = compatibilityIssues.map(({path}) => `- ${path}`).join('\n')
    throw new Error(
      `Migration stopped before asset upload. Resolve schema compatibility for:\n${issuePaths}`,
    )
  }

  const projectId = targetProjectId()
  const dataset = targetDataset()
  const token = process.env.SANITY_WRITE_TOKEN

  if (!projectId) throw new Error('Set SANITY_STUDIO_PROJECT_ID or PUBLIC_SANITY_PROJECT_ID.')
  if (isDraftSeed) assertDraftSeedTarget(projectId, dataset)
  if (!token) throw new Error('SANITY_WRITE_TOKEN is required for the migration.')

  const [{createReadStream}, {basename, resolve}, {createClient}] = await Promise.all([
    import('node:fs'),
    import('node:path'),
    import('@sanity/client'),
  ])
  const client = createClient({
    projectId,
    dataset,
    token,
    apiVersion: '2026-08-11',
    useCdn: false,
  })
  const uploadedAssets = new Map<string, AssetReference>()

  const uploadImage = async (source: string): Promise<AssetReference> => {
    const existing = uploadedAssets.get(source)
    if (existing) return existing

    if (!source.startsWith('/media/')) {
      throw new Error(`Migration only accepts explicitly referenced /media/ assets; received ${source}`)
    }

    const absolutePath = resolve(process.cwd(), 'public', source.slice(1))
    const asset = await client.assets.upload('image', createReadStream(absolutePath), {
      filename: basename(absolutePath),
    })
    const reference: AssetReference = {_type: 'reference', _ref: asset._id}
    uploadedAssets.set(source, reference)
    return reference
  }

  const documents = isDraftSeed
    ? await buildDraftSeedDocuments(uploadImage, localHomePagePayload)
    : await buildMigrationDocuments(uploadImage, localHomePagePayload)
  let transaction = client.transaction()
  for (const document of documents) transaction = transaction.createOrReplace(document)

  const result = await transaction.commit()
  if (isDraftSeed) {
    console.log(`Seeded ${result.results.length} draft documents to ${projectId}/${dataset}.`)
    console.log('No published portfolio documents were created. Review and complete the drafts in Studio.')
  } else {
    console.log(`Migrated ${result.results.length} documents to ${projectId}/${dataset}.`)
    console.log('Review the published records in Studio, then configure the production rebuild webhook.')
  }
}

await (isDryRun ? preview() : migrate())

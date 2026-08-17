import {createClient} from '@sanity/client'

const runtimeEnv = import.meta.env ?? {}
const projectId = runtimeEnv.PUBLIC_SANITY_PROJECT_ID?.trim()
const dataset = runtimeEnv.PUBLIC_SANITY_DATASET?.trim()

const partlyConfigured = Boolean(projectId || dataset)

if (partlyConfigured && (!projectId || !dataset)) {
  throw new Error(
    'Sanity configuration is incomplete. Set both PUBLIC_SANITY_PROJECT_ID and PUBLIC_SANITY_DATASET, or neither for the local foundation source.',
  )
}

export const sanityConfig = projectId && dataset
  ? {projectId, dataset, apiVersion: '2026-08-11'}
  : null

export const sanityClient = sanityConfig
  ? createClient({
      ...sanityConfig,
      useCdn: false,
      perspective: 'published',
    })
  : null

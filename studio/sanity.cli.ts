import {defineCliConfig} from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

if (!projectId) {
  throw new Error('SANITY_STUDIO_PROJECT_ID is required to run the Sanity CLI.')
}

export default defineCliConfig({
  api: {projectId, dataset},
  studioHost: 'siddharth-sareen-portfolio',
})

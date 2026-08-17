import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas'
import {structure, singletonTypes} from './structure'
import {createProjectDuplicateAction} from './actions/duplicateProjectAction'
import {compactStudioTheme} from './theme'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

if (!projectId) {
  throw new Error('SANITY_STUDIO_PROJECT_ID is required to run Sanity Studio.')
}

export default defineConfig({
  name: 'siddharthPortfolio',
  title: 'Siddharth Sareen Portfolio',
  projectId,
  dataset,
  theme: compactStudioTheme,
  plugins: [structureTool({structure}), visionTool()],
  schema: {types: schemaTypes},
  document: {
    newDocumentOptions: (previous) =>
      previous.filter((template) => !singletonTypes.has(template.templateId)),
    actions: (previous, context) => {
      if (singletonTypes.has(context.schemaType)) {
        return previous.filter(({action}) => action && ['publish', 'discardChanges', 'restore'].includes(action))
      }

      if (context.schemaType !== 'project') return previous
      return previous.map((action) => action.action === 'duplicate'
        ? createProjectDuplicateAction(action)
        : action)
    },
  },
})

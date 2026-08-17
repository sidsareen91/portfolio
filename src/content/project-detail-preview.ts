import type {ShippedProject} from './portfolio'

const PLACEHOLDER_PREFIX = 'PLACEHOLDER —'

export type ProjectDetailPreviewProject = ShippedProject & {
  detailLinks: ShippedProject['externalLinks']
  previewFields: string[]
}

const earlyLearnSummary =
  'PLACEHOLDER — Early Learn was an educational game experience designed around playful activities, progression and age-appropriate interactions. This temporary copy is here only to test the project-detail layout and text density.'

const earlyLearnContribution =
  'PLACEHOLDER — This section will explain my contribution to the project, including the systems, features, content, technical design or leadership work I was responsible for. This temporary copy is only for testing the modal layout.'

export const KITCHEN_STORY_FACTS_PREVIEW = [
  {text: '10M+ DOWNLOADS', color: 'yellow'},
  {text: 'TIME MANAGEMENT / SIMULATION', color: 'mint'},
  {text: 'MULTIPLAYER', color: 'coral'},
  {text: 'MOBILE', color: 'lavender'},
] as const

const needsPreviewCopy = (value: string | undefined) =>
  !value?.trim() || value.trim().startsWith(PLACEHOLDER_PREFIX)

const previewSummary = (project: ShippedProject) => project.slug === 'early-learn'
  ? earlyLearnSummary
  : `PLACEHOLDER — Project overview for ${project.title}. This temporary copy is here only to test the project-detail layout and text density.`

const previewContribution = (project: ShippedProject) => project.slug === 'early-learn'
  ? earlyLearnContribution
  : 'PLACEHOLDER — Final contribution details for this project will be added here. This temporary copy is only for testing the modal layout.'

export function prepareProjectDetailPreview(
  projects: ShippedProject[],
  enabled: boolean,
): ProjectDetailPreviewProject[] {
  return projects.map((project) => {
    const previewFields: string[] = []
    const summary = enabled && needsPreviewCopy(project.summary)
      ? (previewFields.push('homepageSummary'), previewSummary(project))
      : project.summary
    const contribution = enabled && needsPreviewCopy(project.contribution)
      ? (previewFields.push('contributionSummary'), previewContribution(project))
      : project.contribution
    const facts = enabled && project.slug === 'kitchen-story' && project.facts.length === 0
      ? (previewFields.push('facts preview'), [...KITCHEN_STORY_FACTS_PREVIEW])
      : project.facts

    let detailMedia = project.detailMedia
    if (enabled && project.slug === 'early-learn' && detailMedia.length === 1) {
      const source = detailMedia[0]
      detailMedia = [source, {...source}, {...source}]
      previewFields.push('galleryMedia[1]', 'galleryMedia[2]')
    }

    const detailLinks = project.externalLinks

    return {...project, summary, facts, contribution, detailMedia, detailLinks, previewFields}
  })
}

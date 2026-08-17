export const HOMEPAGE_SECTION_OPTIONS = [
  {title: 'Hero', value: 'hero'},
  {title: 'Achievements', value: 'achievements'},
  {title: 'Showcased Project', value: 'showcasedProject'},
  {title: 'Design Lab', value: 'designLab'},
  {title: 'Shipped Work', value: 'shippedWork'},
  {title: 'Design Approach', value: 'designApproach'},
  {title: 'About', value: 'about'},
  {title: 'Contact', value: 'contact'},
] as const

export type HomepageSectionId = (typeof HOMEPAGE_SECTION_OPTIONS)[number]['value']

export type HomepageSectionSetting = {
  _key?: string
  _type?: 'homepageSectionSetting'
  section: HomepageSectionId
  visible?: boolean
}

export const DEFAULT_HOMEPAGE_SECTION_ORDER: HomepageSectionId[] =
  HOMEPAGE_SECTION_OPTIONS.map(({value}) => value)

export function createHomepageSectionSettings(
  order: readonly HomepageSectionId[] = DEFAULT_HOMEPAGE_SECTION_ORDER,
): HomepageSectionSetting[] {
  return order.map((section) => ({
    _key: section,
    _type: 'homepageSectionSetting',
    section,
    visible: true,
  }))
}

export const DEFAULT_HOMEPAGE_SECTION_SETTINGS = createHomepageSectionSettings()

function isHomepageSectionId(value: unknown): value is HomepageSectionId {
  return typeof value === 'string'
    && DEFAULT_HOMEPAGE_SECTION_ORDER.includes(value as HomepageSectionId)
}

export function isHomepageSectionConfiguration(
  value: unknown,
): value is HomepageSectionSetting[] {
  if (!Array.isArray(value) || value.length !== DEFAULT_HOMEPAGE_SECTION_ORDER.length) {
    return false
  }

  const sections = value.map((item) => (
    item && typeof item === 'object' ? (item as {section?: unknown}).section : undefined
  ))

  return value.every((item) => {
    if (!item || typeof item !== 'object') return false
    const setting = item as {section?: unknown; visible?: unknown}
    return isHomepageSectionId(setting.section)
      && (setting.visible === undefined || typeof setting.visible === 'boolean')
  }) && new Set(sections).size === DEFAULT_HOMEPAGE_SECTION_ORDER.length
}

export function isHomepageSectionOrder(value: unknown): value is HomepageSectionId[] {
  return Array.isArray(value)
    && value.every((section, index) => isHomepageSectionId(section) && value.indexOf(section) === index)
}

export function resolveHomepageSectionOrder(value: unknown): HomepageSectionId[] {
  if (value === undefined || (Array.isArray(value) && value.length === 0)) {
    return [...DEFAULT_HOMEPAGE_SECTION_ORDER]
  }

  if (!Array.isArray(value)) return [...DEFAULT_HOMEPAGE_SECTION_ORDER]

  return value.flatMap((item) => {
    if (isHomepageSectionId(item)) return [item]
    if (!item || typeof item !== 'object') return []

    const setting = item as {section?: unknown; visible?: unknown}
    return setting.visible !== false && isHomepageSectionId(setting.section)
      ? [setting.section]
      : []
  })
}

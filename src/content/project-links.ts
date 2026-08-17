import type {ProjectExternalLink} from './portfolio'

export type RawProjectExternalLinks = {
  googlePlayUrl?: string
  appStoreUrl?: string
  officialUrl?: string
}

const LINK_DEFINITIONS = [
  {field: 'googlePlayUrl', kind: 'googlePlay', label: 'Google Play'},
  {field: 'appStoreUrl', kind: 'appStore', label: 'App Store'},
  {field: 'officialUrl', kind: 'official', label: 'Official Site'},
] as const

export function isSafeProjectExternalUrl(value: string | undefined): value is string {
  if (!value) return false

  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function resolveProjectExternalLinks(value: RawProjectExternalLinks): ProjectExternalLink[] {
  return LINK_DEFINITIONS.flatMap(({field, kind, label}) => {
    const href = value[field]?.trim()
    return isSafeProjectExternalUrl(href) ? [{kind, label, href}] : []
  })
}

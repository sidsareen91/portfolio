export type AccessibilityMedia = {
  alt?: string
  decorative?: boolean
  image?: unknown
}

export type MediaPlacementDocument = {
  _type?: string
  projectType?: string
}

export type MediaPlacementContext = {
  document?: unknown
  path?: readonly unknown[]
}

const fieldAt = (path: readonly unknown[] | undefined, index: number) =>
  typeof path?.[index] === 'string' ? path[index] : undefined

export function isDefaultDecorativePlacement(context: MediaPlacementContext): boolean {
  const document = context.document as MediaPlacementDocument | undefined
  const firstField = fieldAt(context.path, 0)
  const secondField = fieldAt(context.path, 1)

  if (document?._type === 'homePage' && firstField === 'hero' && secondField === 'media') {
    return true
  }
  if (document?._type === 'prototype' && firstField === 'primaryMedia') return true
  if (document?._type !== 'project') return false
  if (document.projectType === 'shipped' && firstField === 'primaryMedia') return true
  return document.projectType === 'current'
    && (firstField === 'primaryMedia' || firstField === 'galleryMedia')
}

export function hasMeaningfulAlt(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function resolveMediaDecorative(
  value: Pick<AccessibilityMedia, 'alt' | 'decorative'> | undefined,
  defaultDecorative = false,
): boolean {
  if (typeof value?.decorative === 'boolean') return value.decorative
  if (hasMeaningfulAlt(value?.alt)) return false
  return defaultDecorative
}

export function resolvePortraitAlt(name: string | undefined, manualAlt: string | undefined): string {
  const override = manualAlt?.trim()
  if (override) return override

  const canonicalName = name?.trim()
  return canonicalName ? `Portrait of ${canonicalName}` : ''
}

export function imageAssetRef(source: unknown): string | undefined {
  if (!source || typeof source !== 'object') return undefined
  const asset = (source as {asset?: unknown}).asset
  if (typeof asset === 'string') return asset
  if (!asset || typeof asset !== 'object') return undefined

  const reference = (asset as {_ref?: unknown})._ref
  if (typeof reference === 'string' && reference) return reference
  const id = (asset as {_id?: unknown})._id
  return typeof id === 'string' && id ? id : undefined
}

export function sharesImageAsset(
  first: Pick<AccessibilityMedia, 'image'> | undefined,
  second: Pick<AccessibilityMedia, 'image'> | undefined,
): boolean {
  const firstRef = imageAssetRef(first?.image)
  return Boolean(firstRef && firstRef === imageAssetRef(second?.image))
}

export function inheritAccessibilityForSameImage<T extends AccessibilityMedia>(
  fallback: T | undefined,
  editorialSource: T | undefined,
): T | undefined {
  if (!fallback || !editorialSource || !sharesImageAsset(fallback, editorialSource)) return fallback
  return {
    ...fallback,
    alt: editorialSource.alt,
    decorative: editorialSource.decorative,
  }
}

export const HERO_ACCENT_MARK = 'heroAccent'
export const HERO_HEADLINE_MAX_LENGTH = 140
export const HERO_HEADLINE_WARNING_LENGTH = 96

export type HeroHeadlineSegment = {
  text: string
  accent?: boolean
}

export type HeroHeadlineSpan = {
  _key?: string
  _type: 'span'
  text: string
  marks?: string[]
}

export type HeroHeadlineBlock = {
  _key?: string
  _type: 'block'
  style?: 'normal'
  markDefs?: unknown[]
  children: HeroHeadlineSpan[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function compactSegments(values: HeroHeadlineSegment[]): HeroHeadlineSegment[] {
  const compacted: HeroHeadlineSegment[] = []

  for (const value of values) {
    if (!value.text) continue
    const accent = value.accent === true
    const previous = compacted.at(-1)
    if (previous && previous.accent === accent) previous.text += value.text
    else compacted.push({text: value.text, ...(accent ? {accent: true} : {})})
  }

  if (compacted[0]) compacted[0].text = compacted[0].text.replace(/^\s+/, '')
  const last = compacted.at(-1)
  if (last) last.text = last.text.replace(/\s+$/, '')
  return compacted.filter(({text}) => text.length > 0)
}

export function legacyHeroHeadlineToSegments(
  lines: readonly string[],
  accentLineIndex = 1,
): HeroHeadlineSegment[] {
  const segments: HeroHeadlineSegment[] = []

  lines.forEach((line, index) => {
    const text = line.trim()
    if (!text) return
    if (segments.length) segments.push({text: ' '})
    segments.push({text, ...(index === accentLineIndex ? {accent: true} : {})})
  })

  return compactSegments(segments)
}

export function normalizeHeroHeadline(value: unknown): HeroHeadlineSegment[] {
  if (!Array.isArray(value)) return []
  if (value.every((item) => typeof item === 'string')) {
    return legacyHeroHeadlineToSegments(value)
  }
  if (value.every((item) => isRecord(item) && typeof item.text === 'string' && item._type !== 'span')) {
    return compactSegments(value.map((item) => ({
      text: item.text as string,
      ...(item.accent === true ? {accent: true} : {}),
    })))
  }

  const segments: HeroHeadlineSegment[] = []
  let hasBlock = false

  for (const valueItem of value) {
    if (!isRecord(valueItem) || valueItem._type !== 'block' || !Array.isArray(valueItem.children)) continue
    if (hasBlock && segments.length) segments.push({text: ' '})
    hasBlock = true

    for (const child of valueItem.children) {
      if (!isRecord(child) || child._type !== 'span' || typeof child.text !== 'string') continue
      const marks = Array.isArray(child.marks) ? child.marks : []
      segments.push({
        text: child.text,
        ...(marks.includes(HERO_ACCENT_MARK) ? {accent: true} : {}),
      })
    }
  }

  return compactSegments(segments)
}

export function heroHeadlineText(value: unknown): string {
  return normalizeHeroHeadline(value)
    .map(({text}) => text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

export function heroHeadlineToPortableText(
  headline: readonly HeroHeadlineSegment[],
): HeroHeadlineBlock[] {
  const children = compactSegments([...headline]).map((segment, index): HeroHeadlineSpan => ({
    _key: `hero-span-${index + 1}`,
    _type: 'span',
    text: segment.text,
    marks: segment.accent ? [HERO_ACCENT_MARK] : [],
  }))

  return [{
    _key: 'hero-headline',
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children,
  }]
}

export function migrateLegacyHeroHeadline(lines: readonly string[]): HeroHeadlineBlock[] {
  return heroHeadlineToPortableText(legacyHeroHeadlineToSegments(lines))
}

export type HeroHeadlineFitResult = {
  fontSize: number
  resized: boolean
  overflow: boolean
}

export function findLargestFittingHeroFontSize(options: {
  max: number
  min: number
  fits: (fontSize: number) => boolean
  precision?: number
}): HeroHeadlineFitResult {
  const max = Math.max(options.max, options.min)
  const min = Math.min(options.max, options.min)
  const precision = Math.max(options.precision ?? 0.25, 0.05)

  if (options.fits(max)) return {fontSize: max, resized: false, overflow: false}
  if (!options.fits(min)) return {fontSize: min, resized: true, overflow: true}

  let lower = min
  let upper = max
  while (upper - lower > precision) {
    const candidate = (lower + upper) / 2
    if (options.fits(candidate)) lower = candidate
    else upper = candidate
  }

  return {fontSize: lower, resized: true, overflow: false}
}

export function fitHeroHeadlineElement(element: HTMLElement): HeroHeadlineFitResult {
  element.style.removeProperty('font-size')
  const style = window.getComputedStyle(element)
  const max = Number.parseFloat(style.fontSize)
  const configuredMin = Number.parseFloat(style.getPropertyValue('--hero-headline-min-size'))
  const min = Number.isFinite(configuredMin) ? configuredMin : max

  const fits = (fontSize: number) => {
    element.style.fontSize = `${fontSize}px`
    const lineBoxTolerance = Math.max(2, fontSize * 0.18)
    return element.scrollHeight <= element.clientHeight + lineBoxTolerance
      && element.scrollWidth <= element.clientWidth + 2
  }
  const result = findLargestFittingHeroFontSize({max, min, fits})
  element.style.fontSize = `${result.fontSize}px`
  element.dataset.fitStatus = result.overflow ? 'overflow' : result.resized ? 'scaled' : 'maximum'

  if (result.overflow) {
    console.warn('Hero headline exceeds its safe text area at the minimum readable size.')
  }

  return result
}

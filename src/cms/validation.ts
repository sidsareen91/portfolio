import type {HomePagePayload, MediaItem} from '../content/portfolio'
import {isBlueprintRenderUrl} from '../content/blueprint-url'
import {hasMeaningfulTabContent, isPrototypeTagColor} from '../content/design-lab'
import {HERO_HEADLINE_MAX_LENGTH, heroHeadlineText} from '../content/hero-headline'
import {validateCarouselAutoplaySettings} from '../content/carousel-autoplay'
import {isHomepageSectionOrder} from '../content/homepage-sections'

function hasText(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function isAllowedUrl(value: string): boolean {
  return value.startsWith('https://') || value.startsWith('mailto:') || value.startsWith('#')
}

export function validateMedia(media: MediaItem, path: string, errors: string[]) {
  if (!hasText(media.src)) errors.push(`${path}.src is required`)
  if (!media.decorative && !hasText(media.alt)) errors.push(`${path}.alt is required unless decorative`)
  if (media.fit !== 'cover' && media.fit !== 'contain') errors.push(`${path}.fit must be cover or contain`)
}

function exactLength(value: unknown[], count: number, path: string, errors: string[]) {
  if (value.length !== count) errors.push(`${path} must contain exactly ${count} items`)
}

function validateProjectFacts(
  facts: HomePagePayload['site']['bellyBrawl']['facts'],
  path: string,
  errors: string[],
) {
  if (facts.length > 6) errors.push(`${path} must contain 6 items or fewer`)
  facts.forEach((fact, factIndex) => {
    if (!hasText(fact.text)) errors.push(`${path}[${factIndex}].text is required`)
    if (fact.text.length > 64) errors.push(`${path}[${factIndex}].text must be 64 characters or fewer`)
    if (!isPrototypeTagColor(fact.color)) errors.push(`${path}[${factIndex}].color is invalid`)
  })
  if (new Set(facts.map(({text}) => text)).size !== facts.length) {
    errors.push(`${path} must not contain duplicates`)
  }
}

export function validateHomePagePayload(payload: HomePagePayload): void {
  const {site, pageCopy, seo} = payload
  const errors: string[] = []

  for (const [path, value] of [
    ['site.profile.name', site.profile.name],
    ['site.profile.role', site.profile.role],
    ['site.profile.location', site.profile.location],
    ['site.profile.email', site.profile.email],
    ['site.hero.eyebrow', site.hero.eyebrow],
    ['site.bellyBrawl.slug', site.bellyBrawl.slug],
    ['site.bellyBrawl.title', site.bellyBrawl.title],
    ['site.bellyBrawl.role', site.bellyBrawl.role],
    ['site.bellyBrawl.summary', site.bellyBrawl.summary],
    ['site.bellyBrawl.support', site.bellyBrawl.support],
    ['site.contact.message', site.contact.message],
    ['seo.title', seo.title],
    ['seo.description', seo.description],
    ...Object.entries(pageCopy).map(([key, value]) => [`pageCopy.${key}`, value]),
  ] as Array<[string, string]>) {
    if (!hasText(value)) errors.push(`${path} is required`)
  }

  if (!/^\S+@\S+\.\S+$/.test(site.profile.email)) errors.push('site.profile.email must be a valid email')
  if (!isHomepageSectionOrder(site.sectionOrder)) {
    errors.push('site.sectionOrder must contain only known homepage sections without duplicates')
  }

  const heroHeadline = heroHeadlineText(site.hero.headline)
  if (!hasText(heroHeadline)) errors.push('site.hero.headline is required')
  if (heroHeadline.length > HERO_HEADLINE_MAX_LENGTH) {
    errors.push(`site.hero.headline must be ${HERO_HEADLINE_MAX_LENGTH} characters or fewer`)
  }
  if (site.hero.media.length < 1) errors.push('site.hero.media must contain at least 1 item')
  validateCarouselAutoplaySettings(site.carousels.hero, 'site.carousels.hero', errors)
  validateCarouselAutoplaySettings(site.carousels.bellyBrawl, 'site.carousels.bellyBrawl', errors)
  validateCarouselAutoplaySettings(site.carousels.designLab, 'site.carousels.designLab', errors)
  exactLength(site.stats, 4, 'site.stats', errors)
  exactLength(site.approach, 4, 'site.approach', errors)
  if (site.shippedWork.length < 1) errors.push('site.shippedWork must contain at least 1 item')

  if (site.prototypes.length < 1) errors.push('site.prototypes must contain at least 1 item')
  if (site.about.tags.length < 1 || site.about.tags.length > 6) {
    errors.push('site.about.tags must contain between 1 and 6 items')
  }

  validateMedia(site.profile.portrait, 'site.profile.portrait', errors)
  site.hero.media.forEach((media, index) => validateMedia(media, `site.hero.media[${index}]`, errors))
  if (site.bellyBrawl.media.length < 1) errors.push('site.bellyBrawl.media must contain at least 1 item')
  site.bellyBrawl.media.forEach((media, index) => validateMedia(media, `site.bellyBrawl.media[${index}]`, errors))
  validateProjectFacts(site.bellyBrawl.facts, 'site.bellyBrawl.facts', errors)
  site.prototypes.forEach((prototype, index) => {
    if (!hasText(prototype.slug)) errors.push(`site.prototypes[${index}].slug is required`)
    if (!hasText(prototype.title)) errors.push(`site.prototypes[${index}].title is required`)
    if (!hasText(prototype.tag.label)) errors.push(`site.prototypes[${index}].tag.label is required`)
    if (prototype.tag.label.length > 32) {
      errors.push(`site.prototypes[${index}].tag.label must be 32 characters or fewer`)
    }
    if (!isPrototypeTagColor(prototype.tag.color)) {
      errors.push(`site.prototypes[${index}].tag.color must use an approved design token`)
    }
    if (prototype.tabs.length < 1) {
      errors.push(`site.prototypes[${index}].tabs must contain at least 1 item`)
    }
    const tabKeys = prototype.tabs.map(({key}) => key)
    if (tabKeys.some((key) => !hasText(key))) {
      errors.push(`site.prototypes[${index}].tabs must have stable keys`)
    }
    if (new Set(tabKeys).size !== tabKeys.length) {
      errors.push(`site.prototypes[${index}].tabs must not contain duplicate keys`)
    }
    prototype.tabs.forEach((tab, tabIndex) => {
      if (!hasText(tab.label)) {
        errors.push(`site.prototypes[${index}].tabs[${tabIndex}].label is required`)
      }
      if (tab.label.length > 32) {
        errors.push(`site.prototypes[${index}].tabs[${tabIndex}].label must be 32 characters or fewer`)
      }
      if ((tab.body?.length ?? 0) > 700) {
        errors.push(`site.prototypes[${index}].tabs[${tabIndex}].body must be 700 characters or fewer`)
      }
      if ((tab.items?.length ?? 0) > 8) {
        errors.push(`site.prototypes[${index}].tabs[${tabIndex}].items must contain 8 or fewer items`)
      }
      if (!hasMeaningfulTabContent(tab)) {
        errors.push(`site.prototypes[${index}].tabs[${tabIndex}] must contain meaningful content`)
      }
    })
    if ((prototype.blueprintCtaLabel?.length ?? 0) > 32) {
      errors.push(`site.prototypes[${index}].blueprintCtaLabel must be 32 characters or fewer`)
    }
    if (prototype.blueprintUrl && !isBlueprintRenderUrl(prototype.blueprintUrl)) {
      errors.push(`site.prototypes[${index}].blueprintUrl must be an HTTPS blueprintue.com render URL`)
    }
    validateMedia(prototype.media, `site.prototypes[${index}].media`, errors)
  })
  site.shippedWork.forEach((project, index) => {
    if (!hasText(project.slug)) errors.push(`site.shippedWork[${index}].slug is required`)
    if (!hasText(project.title)) errors.push(`site.shippedWork[${index}].title is required`)
    if (!hasText(project.role)) errors.push(`site.shippedWork[${index}].role is required`)
    if (!hasText(project.summary)) errors.push(`site.shippedWork[${index}].summary is required`)
    validateProjectFacts(project.facts, `site.shippedWork[${index}].facts`, errors)
    validateMedia(project.media, `site.shippedWork[${index}].media`, errors)
    if (project.detailMedia.length < 1) errors.push(`site.shippedWork[${index}].detailMedia must contain at least 1 item`)
    project.detailMedia.forEach((media, mediaIndex) => {
      validateMedia(media, `site.shippedWork[${index}].detailMedia[${mediaIndex}]`, errors)
    })
    project.externalLinks.forEach((link, linkIndex) => {
      if (!link.href.startsWith('https://')) {
        errors.push(`site.shippedWork[${index}].externalLinks[${linkIndex}].href must use HTTPS`)
      }
    })
  })

  const slugs = [site.bellyBrawl.slug, ...site.prototypes.map(({slug}) => slug), ...site.shippedWork.map(({slug}) => slug)]
  if (new Set(slugs).size !== slugs.length) errors.push('Project and prototype slugs must be unique')

  for (const [index, link] of site.contact.links.entries()) {
    if (!hasText(link.label)) errors.push(`site.contact.links[${index}].label is required`)
    if (!hasText(link.value)) errors.push(`site.contact.links[${index}].value is required`)
    if (link.href && !isAllowedUrl(link.href)) errors.push(`site.contact.links[${index}].href has an unsupported protocol`)
  }

  if (seo.canonicalUrl && !seo.canonicalUrl.startsWith('https://')) {
    errors.push('seo.canonicalUrl must use HTTPS')
  }
  if (seo.socialImage) validateMedia(seo.socialImage, 'seo.socialImage', errors)

  if (errors.length) {
    throw new Error(`Sanity content validation failed:\n- ${errors.join('\n- ')}`)
  }
}

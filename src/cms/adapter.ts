import {createImageUrlBuilder, type SanityImageSource} from '@sanity/image-url'
import type {
  HomePageCopy,
  HomePagePayload,
  MediaItem,
  ProjectFact,
  PrototypeTagColor,
  SeoContent,
  SiteContent,
} from '../content/portfolio'
import {
  inheritAccessibilityForSameImage,
  resolveMediaDecorative,
  resolvePortraitAlt,
} from '../content/media-accessibility'
import {normalizeHeroHeadline} from '../content/hero-headline'
import {normalizePrototypeTabContent} from '../content/prototype-tab-content'
import {resolveCarouselAutoplaySettings} from '../content/carousel-autoplay'
import {resolveHomepageSectionOrder} from '../content/homepage-sections'
import {resolveProjectExternalLinks} from '../content/project-links'
import {isPrototypeTagColor} from '../content/design-lab'
import {sanityConfig} from './config'
import type {RawCmsPayload, RawImagePlacement, RawMedia, RawProject} from './types'

const builder = sanityConfig ? createImageUrlBuilder(sanityConfig) : null

function mapProjectFact(value: NonNullable<RawProject['facts']>[number]): ProjectFact | undefined {
  const text = (typeof value === 'string' ? value : value.text)?.trim()
  if (!text) return undefined

  return {
    text,
    color: typeof value === 'string' || !isPrototypeTagColor(value.color)
      ? 'yellow'
      : value.color,
  }
}

function imageUrl(
  source: SanityImageSource | undefined,
  options: {fit?: 'cover' | 'contain'; width?: number; height?: number} = {},
): string {
  if (!source || !builder) return ''

  let request = builder.image(source).auto('format').width(options.width ?? 2000)
  if (options.height && options.fit !== 'contain') {
    request = request.height(options.height).fit('crop')
  } else {
    request = request.fit('max')
  }
  return request.url()
}

function mapImagePlacement(
  value: RawImagePlacement | undefined,
  options: {width?: number; height?: number} = {},
  fallbackAlt = '',
): MediaItem {
  return {
    src: imageUrl(value?.image, options),
    alt: value?.alt?.trim() || fallbackAlt,
    fit: 'cover',
  }
}

function mapMedia(
  value: RawMedia | undefined,
  options: {defaultDecorative?: boolean; requireMeaningfulOptIn?: boolean} = {},
): MediaItem {
  const fit = value?.displayMode ?? 'cover'
  const kind = value?.kind ?? 'image'
  const decorative = options.requireMeaningfulOptIn
    ? value?.decorative !== false
    : resolveMediaDecorative(value, options.defaultDecorative)
  const source = kind === 'video'
    ? value?.videoFile?.asset?.url?.trim() || value?.videoUrl?.trim() || ''
    : value?.imageAsset?.mimeType === 'image/gif'
      ? value.imageAsset.url?.trim() ?? ''
      : imageUrl(value?.image, {fit, width: 2000, height: 1125})
  return {
    kind,
    src: source,
    poster: kind === 'video' ? imageUrl(value?.poster, {fit, width: 2000, height: 1125}) : undefined,
    alt: decorative ? '' : value?.alt?.trim() ?? '',
    decorative,
    fit,
  }
}

function mapMediaPoster(
  value: RawMedia | undefined,
  options: {defaultDecorative?: boolean} = {},
): MediaItem {
  const mapped = mapMedia(value, options)
  if (mapped.kind !== 'video') return mapped
  return {
    kind: 'image',
    src: mapped.poster ?? '',
    alt: mapped.alt,
    decorative: mapped.decorative,
    fit: mapped.fit,
  }
}

function mapSeo(value: RawCmsPayload): SeoContent {
  const settings = value.settings
  const globalSeo = settings?.defaultSeo
  const socialImage = globalSeo?.socialImage

  return {
    title: globalSeo?.title?.trim() || '',
    description: globalSeo?.description?.trim() || '',
    canonicalUrl: settings?.siteUrl?.trim() || undefined,
    socialImage: socialImage
      ? mapImagePlacement(socialImage, {width: 1200, height: 630})
      : undefined,
  }
}

export function resolveProjectPrimaryMedia(project: RawProject | undefined): RawMedia | undefined {
  return inheritAccessibilityForSameImage(project?.primaryMedia, project?.galleryMedia?.[0])
}

function mapProjectMedia(
  project: RawProject | undefined,
  options: {defaultDecorative?: boolean} = {},
): MediaItem {
  return mapMediaPoster(resolveProjectPrimaryMedia(project), options)
}

function mapProjectGallery(project: RawProject | undefined): MediaItem[] {
  const gallery = project?.galleryMedia
    ?.map((value) => mapMedia(value, {defaultDecorative: true}))
    .filter(({src}) => src) ?? []
  return gallery.length
    ? gallery
    : [mapMedia(resolveProjectPrimaryMedia(project), {defaultDecorative: true})]
}

export function adaptCmsPayload(raw: RawCmsPayload): HomePagePayload {
  const settings = raw.settings
  const page = raw.page
  const featured = page?.featuredProject
  const shipped = page?.shippedWork?.projects ?? []
  const prototypes = page?.prototypes ?? []
  const resumeLabel = settings?.resumeLabel?.trim() ?? ''
  const resumeUrl = settings?.resumeUrl?.trim()

  const contactLinks: SiteContent['contact']['links'] = [
    {
      label: 'Email',
      value: settings?.email?.trim() ?? '',
      href: settings?.email ? `mailto:${settings.email.trim()}` : undefined,
    },
  ]

  if (settings?.linkedinUrl) {
    contactLinks.push({
      label: 'LinkedIn',
      value: 'LinkedIn',
      href: settings.linkedinUrl?.trim(),
    })
  }
  if (settings?.discordUrl) {
    contactLinks.push({
      label: 'Discord',
      value: 'Discord',
      href: settings.discordUrl?.trim(),
    })
  }
  if (resumeLabel && resumeUrl) {
    contactLinks.push({label: 'Résumé', value: resumeLabel, href: resumeUrl})
  }
  contactLinks.push({label: 'Based in', value: settings?.location?.trim() ?? ''})

  const site: SiteContent = {
    sectionOrder: resolveHomepageSectionOrder(page?.sectionOrder),
    profile: {
      name: settings?.name?.trim() ?? '',
      role: settings?.role?.trim() ?? '',
      location: settings?.location?.trim() ?? '',
      email: settings?.email?.trim() ?? '',
      portrait: mapImagePlacement(
        settings?.portrait,
        {width: 1200},
        resolvePortraitAlt(settings?.name, settings?.portrait?.alt),
      ),
    },
    hero: {
      eyebrow: page?.hero?.eyebrow?.trim() ?? '',
      headline: normalizeHeroHeadline(page?.hero?.headline),
      media: (page?.hero?.media ?? []).map((value) => mapMedia(value, {defaultDecorative: true})),
    },
    carousels: {
      hero: resolveCarouselAutoplaySettings(
        page?.hero?.autoSwitchItems,
        page?.hero?.switchIntervalSeconds,
        true,
      ),
      bellyBrawl: resolveCarouselAutoplaySettings(
        featured?.galleryAutoSwitchItems,
        featured?.gallerySwitchIntervalSeconds,
        true,
      ),
      designLab: resolveCarouselAutoplaySettings(
        page?.designLabAutoSwitchItems,
        page?.designLabSwitchIntervalSeconds,
        false,
      ),
    },
    stats: (page?.stats ?? []).map((stat) => ({
      value: stat.value?.trim() ?? '',
      label: stat.label?.trim() ?? '',
    })),
    bellyBrawl: {
      slug: featured?.slug?.trim() ?? '',
      title: featured?.title?.trim() ?? '',
      role: featured?.role?.trim() ?? '',
      summary: featured?.homepageSummary?.trim() ?? '',
      support: featured?.contributionSummary?.trim() ?? '',
      facts: (featured?.facts ?? [])
        .map(mapProjectFact)
        .filter((fact): fact is ProjectFact => Boolean(fact)),
      media: mapProjectGallery(featured),
    },
    approach: (page?.approach?.steps ?? []).map((step, index) => ({
      number: String(index + 1).padStart(2, '0'),
      title: step.title?.trim() ?? '',
      description: step.description?.trim() ?? '',
    })),
    prototypes: prototypes.map((prototype) => ({
      slug: prototype.slug?.trim() ?? '',
      title: prototype.title?.trim() ?? '',
      tag: {
        label: prototype.tagLabel?.trim() ?? '',
        color: prototype.tagColor ?? ('' as PrototypeTagColor),
      },
      tabs: (prototype.tabs ?? []).map((tab) => ({
        key: tab._key?.trim() ?? '',
        label: tab.label?.trim() ?? '',
        content: normalizePrototypeTabContent(tab.content),
        body: tab.body?.trim() || undefined,
        items: (tab.items ?? []).map((item) => item.trim()).filter(Boolean),
      })),
      media: mapMedia(prototype.primaryMedia, {
        defaultDecorative: true,
        requireMeaningfulOptIn: true,
      }),
      blueprintUrl: prototype.blueprintUrl?.trim() || undefined,
      blueprintCtaEnabled: prototype.blueprintCtaEnabled,
      blueprintCtaLabel: prototype.blueprintCtaLabel?.trim() || undefined,
    })),
    shippedWork: shipped.map((project) => ({
      slug: project.slug?.trim() ?? '',
      title: project.title?.trim() ?? '',
      role: project.role?.trim() ?? '',
      media: mapProjectMedia(project, {defaultDecorative: true}),
      summary: project.homepageSummary?.trim() ?? '',
      facts: (project.facts ?? [])
        .map(mapProjectFact)
        .filter((fact): fact is ProjectFact => Boolean(fact)),
      contribution: project.contributionSummary?.trim() || undefined,
      detailMedia: mapProjectGallery(project),
      externalLinks: resolveProjectExternalLinks(project),
    })),
    about: {
      bio: page?.about?.bio?.trim() ?? '',
      tags: (page?.about?.tags ?? []).map((tag) => tag.trim()),
    },
    contact: {
      message: page?.contact?.headline?.trim() ?? '',
      links: contactLinks,
    },
  }

  const pageCopy: HomePageCopy = {
    featuredProjectKicker: page?.featuredProjectKicker?.trim() ?? '',
    approachTitle: page?.approach?.title?.trim() ?? '',
    designLabTitle: page?.designLabTitle?.trim() ?? '',
    shippedWorkKicker: page?.shippedWork?.kicker?.trim() ?? '',
    shippedWorkTitle: page?.shippedWork?.title?.trim() ?? '',
    aboutKicker: page?.about?.kicker?.trim() ?? '',
    aboutHeading: page?.about?.heading?.trim() ?? '',
    contactKicker: page?.contact?.kicker?.trim() ?? '',
  }

  return {site, pageCopy, seo: mapSeo(raw)}
}

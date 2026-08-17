import type {SanityImageSource} from '@sanity/image-url'
import type {HeroHeadlineBlock} from '../content/hero-headline'
import type {PrototypePortableTextBlock} from '../content/prototype-tab-content'
import type {ProjectFactColor} from '../content/portfolio'
import type {HomepageSectionSetting} from '../content/homepage-sections'

export type RawImagePlacement = {
  image?: SanityImageSource
  alt?: string
}

export type RawMedia = {
  kind?: 'image' | 'video'
  image?: SanityImageSource
  imageAsset?: {url?: string; mimeType?: string}
  videoFile?: {asset?: {url?: string}}
  videoUrl?: string
  poster?: SanityImageSource
  alt?: string
  decorative?: boolean
  displayMode?: 'cover' | 'contain'
  caption?: string
}

export type RawProject = {
  title?: string
  slug?: string
  projectType?: 'current' | 'shipped'
  role?: string
  homepageSummary?: string
  facts?: Array<string | {
    _key?: string
    text?: string
    color?: ProjectFactColor
  }>
  contributionSummary?: string
  primaryMedia?: RawMedia
  galleryMedia?: RawMedia[]
  galleryAutoSwitchItems?: boolean
  gallerySwitchIntervalSeconds?: number
  googlePlayUrl?: string
  appStoreUrl?: string
  officialUrl?: string
}

export type RawPrototype = {
  title?: string
  slug?: string
  tagLabel?: string
  tagColor?: 'yellow' | 'mint' | 'coral' | 'lavender'
  tabs?: Array<{
    _key?: string
    label?: string
    content?: PrototypePortableTextBlock[]
    body?: string
    items?: string[]
  }>
  primaryMedia?: RawMedia
  blueprintUrl?: string
  blueprintCtaEnabled?: boolean
  blueprintCtaLabel?: string
}

export type RawSeo = {
  title?: string
  description?: string
  socialImage?: RawImagePlacement
}

export type RawCmsPayload = {
  settings?: {
    name?: string
    role?: string
    location?: string
    email?: string
    portrait?: RawImagePlacement
    linkedinUrl?: string
    discordUrl?: string
    resumeLabel?: string
    resumeUrl?: string
    siteUrl?: string
    defaultSeo?: RawSeo
  }
  page?: {
    sectionOrder?: Array<string | HomepageSectionSetting>
    hero?: {
      eyebrow?: string
      headline?: HeroHeadlineBlock[] | string[]
      media?: RawMedia[]
      autoSwitchItems?: boolean
      switchIntervalSeconds?: number
    }
    stats?: Array<{value?: string; label?: string}>
    featuredProjectKicker?: string
    featuredProject?: RawProject
    approach?: {
      title?: string
      steps?: Array<{title?: string; description?: string}>
    }
    designLabTitle?: string
    designLabAutoSwitchItems?: boolean
    designLabSwitchIntervalSeconds?: number
    prototypes?: RawPrototype[]
    shippedWork?: {
      kicker?: string
      title?: string
      projects?: RawProject[]
    }
    about?: {
      kicker?: string
      heading?: string
      bio?: string
      tags?: string[]
      fieldNotesTitle?: string
      notes?: Array<{title?: string; description?: string}>
    }
    contact?: {
      kicker?: string
      headline?: string
    }
  }
}

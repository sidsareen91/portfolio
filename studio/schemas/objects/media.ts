import {defineField, defineType} from 'sanity'
import {
  hasMeaningfulAlt,
  isDefaultDecorativePlacement,
  sharesImageAsset,
} from '../../../src/content/media-accessibility'
import {
  PrototypeMediaAccessibilityField,
  PrototypeMediaAccessibilityInput,
} from '../../components/PrototypeMediaAccessibilityField'

type MediaValue = {
  kind?: 'image' | 'video'
  image?: unknown
  videoFile?: unknown
  videoUrl?: string
  poster?: unknown
}

type MediaDocument = {
  _type?: string
  projectType?: string
  primaryMedia?: MediaValue
  galleryMedia?: MediaValue[]
}

type MediaValidationContext = {
  document?: unknown
  parent?: unknown
  path?: readonly unknown[]
}

type MediaPreviewSelection = {
  image?: any
  imageFilename?: string
  kind?: 'image' | 'video'
  poster?: any
  videoFilename?: string
  videoUrl?: string
}

const fieldAt = (path: readonly unknown[] | undefined, index: number) =>
  typeof path?.[index] === 'string' ? path[index] : undefined

export {isDefaultDecorativePlacement} from '../../../src/content/media-accessibility'

export function isPrototypePrimaryMedia(context: MediaValidationContext): boolean {
  const document = context.document as MediaDocument | undefined
  return document?._type === 'prototype' && fieldAt(context.path, 0) === 'primaryMedia'
}

export function shouldHideMediaAlt(context: MediaValidationContext): boolean {
  if (isCurrentProjectPrimaryReuse(context)) return true
  const explicitDecorative = (context.parent as {decorative?: boolean} | undefined)?.decorative
  if (isPrototypePrimaryMedia(context)) return explicitDecorative !== false
  return explicitDecorative === true
    || (explicitDecorative === undefined && isDefaultDecorativePlacement(context))
}

export function isCurrentProjectPrimaryReuse(context: MediaValidationContext): boolean {
  const document = context.document as MediaDocument | undefined
  return document?._type === 'project'
    && document.projectType === 'current'
    && fieldAt(context.path, 0) === 'primaryMedia'
    && sharesImageAsset(document.primaryMedia, document.galleryMedia?.[0])
}

export function mediaAltWarning(
  value: string | undefined,
  context: MediaValidationContext,
): true | string {
  if (isCurrentProjectPrimaryReuse(context)) return true
  if (hasMeaningfulAlt(value)) return true

  const explicitDecorative = (context.parent as {decorative?: boolean} | undefined)?.decorative
  if (isPrototypePrimaryMedia(context)) {
    return explicitDecorative === false
      ? 'Add alternative text or turn off “Media adds information beyond the text” before production.'
      : true
  }
  const effectiveDecorative = explicitDecorative === true
    || (explicitDecorative === undefined && isDefaultDecorativePlacement(context))
  return effectiveDecorative
    ? true
    : 'Add alternative text or mark this media decorative before production.'
}

export function validateMediaIntegrity(value: MediaValue | undefined): true | string {
  if (!value) return 'Media is required.'
  if (value.kind === 'image' && !value.image) return 'Choose an image.'
  if (value.kind === 'video' && !value.poster) return 'Video requires an image poster.'
  if (value.kind === 'video' && !value.videoFile && !value.videoUrl) {
    return 'Video requires either a file or an HTTPS URL.'
  }
  return true
}

export function prepareMediaPreview({
  image,
  imageFilename,
  kind,
  poster,
  videoFilename,
  videoUrl,
}: MediaPreviewSelection) {
  const isVideo = kind === 'video'
  const sourceLabel = isVideo ? videoFilename || videoUrl : imageFilename

  return {
    title: isVideo ? 'Video' : 'Image',
    subtitle: sourceLabel || (isVideo ? 'Video source unavailable' : 'Filename unavailable'),
    media: isVideo ? poster : image,
  }
}

export const media = defineType({
  name: 'media',
  title: 'Media',
  type: 'object',
  fieldsets: [
    {
      name: 'advanced',
      title: 'Advanced presentation',
      options: {collapsible: true, collapsed: true},
    },
  ],
  validation: (Rule) => Rule.custom(validateMediaIntegrity),
  fields: [
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      initialValue: 'image',
      options: {
        layout: 'radio',
        list: [
          {title: 'Image', value: 'image'},
          {title: 'Video', value: 'video'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.kind === 'video',
    }),
    defineField({
      name: 'videoFile',
      title: 'Video file',
      type: 'file',
      hidden: ({parent}) => parent?.kind !== 'video',
      options: {accept: 'video/mp4,video/webm'},
    }),
    defineField({
      name: 'videoUrl',
      title: 'External video URL',
      type: 'url',
      description: 'Use a direct HTTPS video file URL or a YouTube watch, share, Shorts, live, or embed URL.',
      hidden: ({parent}) => parent?.kind !== 'video',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
    defineField({
      name: 'poster',
      title: 'Video poster',
      type: 'image',
      description: 'Displayed while the video loads and when reduced motion is enabled.',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.kind !== 'video',
    }),
    defineField({
      name: 'decorative',
      title: 'Decorative only',
      type: 'boolean',
      initialValue: true,
      description: 'Use when the media adds no information beyond nearby text. Hero, current-project gallery, and shipped-cover media default to decorative when this is unset and no alt override is supplied.',
      components: {
        field: PrototypeMediaAccessibilityField,
        input: PrototypeMediaAccessibilityInput,
      },
      hidden: (context) => isCurrentProjectPrimaryReuse(context),
    }),
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      description: 'Accessibility metadata only. Describe the useful information that would otherwise be lost; do not repeat the prototype tabs, project summary, or use this as a caption.',
      hidden: shouldHideMediaAlt,
      validation: (Rule) => [
        Rule.max(220),
        Rule.custom((value) => {
          if (!hasMeaningfulAlt(value) || value.trim().length >= 2) return true
          return 'Alternative text must be at least 2 characters.'
        }),
        Rule.custom((value, context) => mediaAltWarning(value, context)).warning(),
      ],
    }),
    defineField({
      name: 'displayMode',
      title: 'Display mode',
      type: 'string',
      description: 'Optional override. Leave empty to use the code-owned cover behavior.',
      fieldset: 'advanced',
      options: {
        layout: 'radio',
        list: [
          {title: 'Cover the 16:9 stage', value: 'cover'},
          {title: 'Contain all technical evidence', value: 'contain'},
        ],
      },
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional context. It is stored but not rendered until a caption placement is approved.',
      fieldset: 'advanced',
      hidden: true,
      validation: (Rule) => Rule.max(240),
    }),
  ],
  preview: {
    select: {
      image: 'image',
      imageFilename: 'image.asset.originalFilename',
      kind: 'kind',
      poster: 'poster',
      videoFilename: 'videoFile.asset.originalFilename',
      videoUrl: 'videoUrl',
    },
    prepare: prepareMediaPreview,
  },
})

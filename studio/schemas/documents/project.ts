import {defineArrayMember, defineField, defineType} from 'sanity'
import {
  CarouselAutoSwitchField,
  CarouselAutoSwitchInput,
  CarouselFollowingArrayField,
  CarouselSwitchTimeField,
  CarouselSwitchTimeInput,
} from '../../components/HeroCarouselControls'
import {MediaArrayInput} from '../../components/MediaArrayInput'
import {ProjectFactsInput} from '../../components/ProjectFactsInput'
import {SummaryTextInput} from '../../components/SummaryTextInput'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fieldsets: [
    {
      name: 'galleryCarouselControls',
      title: 'Carousel controls',
      options: {columns: 2},
    },
  ],
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required().max(60)}),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Public project identifier. Changing this does not create a new Project document; use “Duplicate as new project” when making a separate entry.',
      options: {source: 'title', maxLength: 80},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'projectType',
      title: 'Homepage placement type',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          {title: 'Current project', value: 'current'},
          {title: 'Shipped work', value: 'shipped'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({
      name: 'homepageSummary',
      title: 'Homepage summary',
      type: 'text',
      rows: 3,
      description: 'Recommended length: 250 characters. Longer copy is allowed when the homepage layout has room.',
      components: {input: SummaryTextInput},
      validation: (Rule) => [
        Rule.required(),
        Rule.max(250).warning('Over the recommended 250 characters. Longer copy is allowed.'),
      ],
    }),
    defineField({
      name: 'facts',
      title: 'Project facts',
      type: 'array',
      description: 'Optional ordered badge facts shown beneath the project overview. Open each item to choose its color.',
      components: {input: ProjectFactsInput},
      of: [defineArrayMember({type: 'projectFact'})],
      validation: (Rule) => Rule.max(6).custom((facts: Array<string | {text?: string}> | undefined) => {
        const labels = (facts ?? []).map((fact) => (
          typeof fact === 'string' ? fact.trim() : fact?.text?.trim()
        )).filter(Boolean)
        return new Set(labels).size === labels.length || 'Project facts must not contain duplicates.'
      }),
    }),
    defineField({
      name: 'contributionSummary',
      title: 'Contribution summary',
      type: 'text',
      rows: 3,
      description: 'Recommended length: 250 characters. Longer copy is allowed when the project layout has room.',
      components: {input: SummaryTextInput},
      validation: (Rule) => [
        Rule.custom((value, context) => {
          const parent = context.parent as {projectType?: string} | undefined
          return parent?.projectType !== 'current' || (typeof value === 'string' && value.trim())
            ? true
            : 'Contribution summary is required for the current project.'
        }),
        Rule.max(250).warning('Over the recommended 250 characters. Longer copy is allowed.'),
      ],
    }),
    // Keep the retired key registered but invisible until legacy document values are cleaned up.
    // Removing it outright would make existing Sanity documents show an unknown-field warning.
    defineField({name: 'modalSummary', title: 'Retired project dialog summary', type: 'text', hidden: true}),
    defineField({
      name: 'primaryMedia',
      title: 'Primary media',
      type: 'media',
      description: 'Required fallback or card media. Shipped covers default to decorative. For a current-project gallery, matching gallery item 1 supplies accessibility metadata.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'galleryAutoSwitchItems',
      title: 'Auto-switch gallery',
      type: 'boolean',
      options: {layout: 'checkbox'},
      initialValue: true,
      hidden: ({parent}) => parent?.projectType === 'shipped',
      fieldset: 'galleryCarouselControls',
      components: {
        field: CarouselAutoSwitchField,
        input: CarouselAutoSwitchInput,
      },
    }),
    defineField({
      name: 'gallerySwitchIntervalSeconds',
      title: 'Switch time (seconds)',
      type: 'number',
      placeholder: '7',
      initialValue: 7,
      hidden: ({parent}) => parent?.projectType === 'shipped' || parent?.galleryAutoSwitchItems === false,
      fieldset: 'galleryCarouselControls',
      components: {
        field: CarouselSwitchTimeField,
        input: CarouselSwitchTimeInput,
      },
      validation: (Rule) => Rule.integer().min(1).max(60),
    }),
    defineField({
      name: 'galleryMedia',
      title: 'Project gallery media',
      description: 'Optional project carousel media. Items default to decorative; add alt only for unique visual information. The primary media is used when this is empty.',
      type: 'array',
      components: {field: CarouselFollowingArrayField, input: MediaArrayInput},
      of: [{type: 'media'}],
    }),
    defineField({
      name: 'googlePlayUrl',
      title: 'Google Play URL',
      type: 'url',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
    defineField({
      name: 'appStoreUrl',
      title: 'App Store URL',
      type: 'url',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
    defineField({
      name: 'officialUrl',
      title: 'Official project URL',
      type: 'url',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'role', media: 'primaryMedia.image', poster: 'primaryMedia.poster'},
    prepare: ({title, subtitle, media, poster}) => ({title, subtitle, media: media || poster}),
  },
})

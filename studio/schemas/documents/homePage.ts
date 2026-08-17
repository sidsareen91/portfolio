import {defineArrayMember, defineField, defineType} from 'sanity'
import {
  HERO_ACCENT_MARK,
  HERO_HEADLINE_MAX_LENGTH,
  HERO_HEADLINE_WARNING_LENGTH,
  heroHeadlineText,
} from '../../../src/content/hero-headline'
import {
  HeroAccentDecorator,
  HeroAccentIcon,
} from '../../components/HeroAccentDecorator'
import {HomepageSectionField} from '../../components/HomepageSectionField'
import {
  HomepageSectionOrderInput,
  HomepageSectionOrderItem,
} from '../../components/HomepageSectionOrderInput'
import {MediaArrayInput} from '../../components/MediaArrayInput'
import {
  CarouselAutoSwitchField,
  CarouselAutoSwitchInput,
  CarouselFollowingArrayField,
  CarouselSwitchTimeField,
  CarouselSwitchTimeInput,
  HeroAutoSwitchField,
  HeroAutoSwitchInput,
  HeroMediaField,
  HeroSwitchTimeField,
  HeroSwitchTimeInput,
} from '../../components/HeroCarouselControls'
import {
  DEFAULT_HOMEPAGE_SECTION_ORDER,
  DEFAULT_HOMEPAGE_SECTION_SETTINGS,
  HOMEPAGE_SECTION_OPTIONS,
  isHomepageSectionConfiguration,
} from '../../../src/content/homepage-sections'

export const homePage = defineType({
  name: 'homePage',
  title: 'Homepage',
  type: 'document',
  fieldsets: [
    {
      name: 'designLabCarouselControls',
      title: 'Carousel controls',
      options: {columns: 2},
    },
  ],
  fields: [
    defineField({
      name: 'sectionOrder',
      title: 'Website section order',
      type: 'array',
      description: 'Drag to set the order visitors see. Use the eye button to hide or show a section without losing its position.',
      initialValue: DEFAULT_HOMEPAGE_SECTION_SETTINGS,
      components: {input: HomepageSectionOrderInput},
      options: {
        disableActions: ['add', 'addBefore', 'addAfter', 'remove', 'duplicate', 'copy'],
      },
      of: [
        defineArrayMember({
          name: 'homepageSectionSetting',
          title: 'Homepage section',
          type: 'object',
          components: {item: HomepageSectionOrderItem},
          fields: [
            defineField({
              name: 'section',
              title: 'Section',
              type: 'string',
              options: {list: [...HOMEPAGE_SECTION_OPTIONS]},
              readOnly: true,
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'visible',
              title: 'Visible on website',
              type: 'boolean',
              initialValue: true,
              hidden: true,
            }),
          ],
          preview: {
            select: {section: 'section', visible: 'visible'},
            prepare: ({section, visible}) => ({
              title: HOMEPAGE_SECTION_OPTIONS.find(({value}) => value === section)?.title
                ?? 'Homepage section',
              subtitle: visible === false ? 'Hidden from website' : 'Visible on website',
            }),
          },
        }),
      ],
      validation: (Rule) => Rule.required()
        .length(DEFAULT_HOMEPAGE_SECTION_ORDER.length)
        .custom((value) => isHomepageSectionConfiguration(value)
          ? true
          : 'Include every website section exactly once.'),
    }),
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      components: {field: HomepageSectionField},
      fieldsets: [
        {
          name: 'carouselControls',
          title: 'Carousel controls',
          options: {columns: 2},
        },
      ],
      fields: [
        defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string', validation: (Rule) => Rule.required().max(70)}),
        defineField({
          name: 'headline',
          title: 'Headline',
          type: 'array',
          description: 'Select the words you want colored, then click Coral Accent in the toolbar. Select accented words and click it again to remove the color.',
          of: [
            defineArrayMember({
              type: 'block',
              styles: [],
              lists: [],
              marks: {
                decorators: [{
                  title: 'Coral Accent',
                  value: HERO_ACCENT_MARK,
                  icon: HeroAccentIcon,
                  component: HeroAccentDecorator,
                }],
                annotations: [],
              },
            }),
          ],
          validation: (Rule) => [
            Rule.required().custom((value) => {
              const text = heroHeadlineText(value)
              if (!text) return 'Headline is required.'
              if (Array.isArray(value) && value.length > 1) {
                return 'Keep the headline as one paragraph; line wrapping is automatic.'
              }
              return text.length <= HERO_HEADLINE_MAX_LENGTH
                ? true
                : `Headline must be ${HERO_HEADLINE_MAX_LENGTH} characters or fewer.`
            }),
            Rule.custom((value) => heroHeadlineText(value).length > HERO_HEADLINE_WARNING_LENGTH
              ? 'This headline may be too long to fit the approved Hero area comfortably.'
              : true).warning(),
          ],
        }),
        defineField({
          name: 'autoSwitchItems',
          title: 'Auto-switch Hero',
          type: 'boolean',
          options: {layout: 'checkbox'},
          initialValue: true,
          fieldset: 'carouselControls',
          components: {
            field: HeroAutoSwitchField,
            input: HeroAutoSwitchInput,
          },
        }),
        defineField({
          name: 'switchIntervalSeconds',
          title: 'Switch time (seconds)',
          type: 'number',
          placeholder: '7',
          initialValue: 7,
          hidden: ({parent}) => parent?.autoSwitchItems === false,
          fieldset: 'carouselControls',
          components: {
            field: HeroSwitchTimeField,
            input: HeroSwitchTimeInput,
          },
          validation: (Rule) => Rule.integer().min(1).max(60),
        }),
        defineField({
          name: 'media',
          title: 'Hero media',
          description: 'Supporting imagery defaults to decorative. Add alt text only when an item communicates unique information.',
          type: 'array',
          components: {field: HeroMediaField, input: MediaArrayInput},
          of: [defineArrayMember({type: 'media'})],
          validation: (Rule) => Rule.required().min(1),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'stats',
      title: 'Achievements',
      type: 'array',
      components: {field: HomepageSectionField},
      of: [
        defineArrayMember({
          type: 'object',
          name: 'stat',
          fields: [
            defineField({name: 'value', title: 'Value', type: 'string', validation: (Rule) => Rule.required().max(10)}),
            defineField({name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required().max(40)}),
          ],
          preview: {select: {title: 'value', subtitle: 'label'}},
        }),
      ],
      validation: (Rule) => Rule.required().length(4),
    }),
    defineField({
      name: 'featuredProjectKicker',
      title: 'Featured-project kicker',
      type: 'string',
      components: {field: HomepageSectionField},
      validation: (Rule) => Rule.required().max(40),
    }),
    defineField({
      name: 'featuredProject',
      title: 'Featured project',
      type: 'reference',
      to: [{type: 'project'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'approach',
      title: 'Design Approach',
      type: 'object',
      components: {field: HomepageSectionField},
      fields: [
        defineField({name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required().max(50)}),
        defineField({
          name: 'steps',
          title: 'Steps',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'approachStep',
              fields: [
                defineField({name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required().max(45)}),
                defineField({
                  name: 'description',
                  title: 'Description',
                  type: 'text',
                  rows: 2,
                  validation: (Rule) => Rule.required().max(160),
                }),
              ],
              preview: {select: {title: 'title', subtitle: 'description'}},
            }),
          ],
          validation: (Rule) => Rule.required().length(4),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'designLabTitle',
      title: 'Design Lab title',
      type: 'string',
      components: {field: HomepageSectionField},
      validation: (Rule) => Rule.required().max(50),
    }),
    defineField({
      name: 'designLabAutoSwitchItems',
      title: 'Auto-switch Design Lab',
      type: 'boolean',
      options: {layout: 'checkbox'},
      initialValue: false,
      fieldset: 'designLabCarouselControls',
      components: {
        field: CarouselAutoSwitchField,
        input: CarouselAutoSwitchInput,
      },
    }),
    defineField({
      name: 'designLabSwitchIntervalSeconds',
      title: 'Switch time (seconds)',
      type: 'number',
      placeholder: '7',
      initialValue: 7,
      hidden: ({document}) => document?.designLabAutoSwitchItems !== true,
      fieldset: 'designLabCarouselControls',
      components: {
        field: CarouselSwitchTimeField,
        input: CarouselSwitchTimeInput,
      },
      validation: (Rule) => Rule.integer().min(1).max(60),
    }),
    defineField({
      name: 'prototypes',
      title: 'Design Lab prototypes',
      type: 'array',
      description: 'Select and order existing Prototype documents. Create new prototypes from the Prototypes list.',
      components: {field: CarouselFollowingArrayField},
      options: {disableActions: ['duplicate', 'copy']},
      of: [defineArrayMember({type: 'reference', to: [{type: 'prototype'}]})],
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({
      name: 'shippedWork',
      title: 'Shipped Work',
      type: 'object',
      components: {field: HomepageSectionField},
      fields: [
        defineField({name: 'kicker', title: 'Kicker', type: 'string', validation: (Rule) => Rule.required().max(40)}),
        defineField({name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required().max(60)}),
        defineField({
          name: 'projects',
          title: 'Projects',
          type: 'array',
          description: 'Select and order existing shipped Project documents. Create new projects from the Projects list.',
          options: {disableActions: ['duplicate', 'copy']},
          of: [
            defineArrayMember({
              type: 'reference',
              to: [{type: 'project'}],
              options: {
                filter: ({parent}) => {
                  const selectedIds = ((parent as Array<{_ref?: string}> | undefined) ?? [])
                    .map(({_ref}) => _ref)
                    .filter((value): value is string => Boolean(value))
                  return {
                    filter: 'projectType == "shipped" && !(_id in $selectedIds)',
                    params: {selectedIds},
                  }
                },
              },
            }),
          ],
          validation: (Rule) => Rule.required().min(1).unique(),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'about',
      title: 'About',
      type: 'object',
      components: {field: HomepageSectionField},
      fields: [
        defineField({name: 'kicker', title: 'Kicker', type: 'string', validation: (Rule) => Rule.required().max(40)}),
        defineField({name: 'heading', title: 'Heading', type: 'string', validation: (Rule) => Rule.required().max(70)}),
        defineField({name: 'bio', title: 'Biography', type: 'text', rows: 4, validation: (Rule) => Rule.required().max(480)}),
        defineField({
          name: 'tags',
          title: 'Capability tags',
          type: 'array',
          of: [defineArrayMember({type: 'string'})],
          validation: (Rule) => Rule.required().min(1).max(6).unique(),
        }),
        defineField({
          name: 'fieldNotesTitle',
          title: 'Field Notes title',
          type: 'string',
          validation: (Rule) => Rule.required().max(40),
        }),
        defineField({
          name: 'notes',
          title: 'Field Notes',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'fieldNote',
              fields: [
                defineField({name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required().max(35)}),
                defineField({
                  name: 'description',
                  title: 'Description',
                  type: 'string',
                  validation: (Rule) => Rule.required().max(100),
                }),
              ],
              preview: {select: {title: 'title', subtitle: 'description'}},
            }),
          ],
          validation: (Rule) => Rule.required().length(3),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'contact',
      title: 'Contact',
      type: 'object',
      components: {field: HomepageSectionField},
      fields: [
        defineField({name: 'kicker', title: 'Kicker', type: 'string', validation: (Rule) => Rule.required().max(40)}),
        defineField({name: 'headline', title: 'Headline', type: 'string', validation: (Rule) => Rule.required().max(100)}),
      ],
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {prepare: () => ({title: 'Homepage'})},
})

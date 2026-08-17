import {defineArrayMember, defineField, defineType} from 'sanity'
import {isBlueprintRenderUrl} from '../../../src/content/blueprint-url'
import {BlueprintUrlInput} from '../../components/BlueprintUrlInput'
import {
  HeroAccentDecorator,
  HeroAccentIcon,
} from '../../components/HeroAccentDecorator'
import {
  DESIGN_LAB_HIGHLIGHT_MARK,
  prototypePortableTextPlainText,
  type PrototypePortableTextBlock,
} from '../../../src/content/prototype-tab-content'

const hasMeaningfulTabContent = (value: {
  content?: PrototypePortableTextBlock[]
  body?: string
  items?: string[]
} | undefined) => Boolean(
  prototypePortableTextPlainText(value?.content)
  || value?.body?.trim()
  || value?.items?.some((item) => item?.trim()),
)

export const prototype = defineType({
  name: 'prototype',
  title: 'Prototype',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required().max(70)}),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 80},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tagLabel',
      title: 'Tag label',
      type: 'string',
      description: 'Short content label shown above this prototype title.',
      validation: (Rule) => Rule.required().max(32),
    }),
    defineField({
      name: 'tagColor',
      title: 'Tag color',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          {title: 'Yellow', value: 'yellow'},
          {title: 'Mint', value: 'mint'},
          {title: 'Coral', value: 'coral'},
          {title: 'Lavender', value: 'lavender'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tabs',
      title: 'Folder tabs',
      type: 'array',
      description: 'Drag to control the editorial order. Each tab stays inside this prototype.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'prototypeFolderTab',
          title: 'Folder tab',
          fields: [
            defineField({
              name: 'label',
              title: 'Tab label',
              type: 'string',
              validation: (Rule) => Rule.required().max(32),
            }),
            defineField({
              name: 'content',
              title: 'Tab content',
              type: 'array',
              description: 'Write paragraphs or bullet lists. Select the words you want highlighted, then click Highlight in the toolbar. Select highlighted words and click it again to remove the emphasis.',
              of: [
                defineArrayMember({
                  type: 'block',
                  styles: [],
                  lists: [{title: 'Bullet list', value: 'bullet'}],
                  marks: {
                    decorators: [{
                      title: 'Highlight',
                      value: DESIGN_LAB_HIGHLIGHT_MARK,
                      icon: HeroAccentIcon,
                      component: HeroAccentDecorator,
                    }],
                    annotations: [],
                  },
                }),
              ],
              validation: (Rule) => Rule.custom((value) => {
                const text = prototypePortableTextPlainText(value as PrototypePortableTextBlock[] | undefined)
                return text.length <= 700 || 'Tab content must be 700 characters or fewer.'
              }),
            }),
            defineField({
              name: 'body',
              title: 'Existing paragraph text',
              type: 'text',
              description: 'Legacy plain text. Move it into Tab content above when you need inline highlighting.',
              rows: 5,
              hidden: ({parent}) => Boolean(prototypePortableTextPlainText(parent?.content))
                || !parent?.body?.trim(),
              validation: (Rule) => Rule.max(700),
            }),
            defineField({
              name: 'items',
              title: 'Existing list items',
              type: 'array',
              description: 'Legacy list content. Move it into Tab content above when you need inline highlighting.',
              of: [defineArrayMember({type: 'string'})],
              hidden: ({parent}) => Boolean(prototypePortableTextPlainText(parent?.content))
                || !parent?.items?.some((item: string) => item?.trim()),
              validation: (Rule) => Rule.max(8),
            }),
          ],
          validation: (Rule) => Rule.custom((value) => hasMeaningfulTabContent(value)
            || 'Add tab content, existing paragraph text, or at least one existing list item.'),
          preview: {
            select: {title: 'label', content: 'content', body: 'body', items: 'items'},
            prepare: ({title, content, body, items}) => ({
              title,
              subtitle: prototypePortableTextPlainText(content)?.trim()
                || body?.trim()
                || items?.filter(Boolean).join(' · ')
                || 'Add tab content',
            }),
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).custom((tabs) => {
        if (!tabs) return true
        const keys = (tabs as Array<{_key?: string}>).map((tab) => tab?._key).filter(Boolean)
        return keys.length === new Set(keys).size || 'Folder tab keys must be unique.'
      }),
    }),
    defineField({
      name: 'primaryMedia',
      title: 'Primary media',
      type: 'media',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'blueprintUrl',
      title: 'Blueprint URL',
      type: 'url',
      description: 'Paste the BlueprintUE link you copied. /blueprint/... links automatically become iframe-ready /render/... links.',
      components: {input: BlueprintUrlInput},
      validation: (Rule) => Rule
        .uri({scheme: ['https']})
        .custom((value) => !value || isBlueprintRenderUrl(value)
          || 'Paste an HTTPS blueprintue.com/blueprint/... or /render/... URL.'),
    }),
    defineField({
      name: 'blueprintCtaEnabled',
      title: 'Show Blueprint CTA',
      type: 'boolean',
      description: 'Leave unset or enabled for normal URL-driven behavior. Disable to hide the CTA.',
    }),
    defineField({
      name: 'blueprintCtaLabel',
      title: 'Blueprint CTA label override',
      type: 'string',
      description: 'Optional. The code-owned default is “VIEW BLUEPRINT”.',
      hidden: ({parent}) => parent?.blueprintCtaEnabled === false,
      validation: (Rule) => Rule.max(32),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'tagLabel', media: 'primaryMedia.image', poster: 'primaryMedia.poster'},
    prepare: ({title, subtitle, media, poster}) => ({title, subtitle, media: media || poster}),
  },
})

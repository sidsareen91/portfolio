import {defineField, defineType} from 'sanity'
import {hasMeaningfulAlt} from '../../../src/content/media-accessibility'

type ImagePlacementContext = {
  parent?: unknown
  path?: readonly unknown[]
}

const firstField = (context: ImagePlacementContext) =>
  typeof context.path?.[0] === 'string' ? context.path[0] : undefined

export const imagePlacement = defineType({
  name: 'imagePlacement',
  title: 'Image placement',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      description: 'Optional accessibility text for this image. Describe only useful information that is not already available nearby.',
      validation: (Rule) => [
        Rule.max(220),
        Rule.custom((value) => {
          if (!hasMeaningfulAlt(value) || value.trim().length >= 2) return true
          return 'Alternative text must be at least 2 characters.'
        }),
        Rule.custom((value, context) => {
          const parent = context.parent as {image?: unknown} | undefined
          if (firstField(context) === 'portrait' || !parent?.image || hasMeaningfulAlt(value)) {
            return true
          }
          return 'Add alternative text for this social image before production.'
        }).warning(),
      ],
    }),
  ],
})

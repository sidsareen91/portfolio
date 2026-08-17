import {defineField, defineType} from 'sanity'
import {PROTOTYPE_TAG_COLORS} from '../../../src/content/design-lab'

const colorTitle = (color: string) => color.charAt(0).toUpperCase() + color.slice(1)

export const projectFact = defineType({
  name: 'projectFact',
  title: 'Project fact',
  type: 'object',
  initialValue: {color: 'yellow'},
  fields: [
    defineField({
      name: 'text',
      title: 'Fact text',
      type: 'string',
      validation: (Rule) => Rule.required().max(64),
    }),
    defineField({
      name: 'color',
      title: 'Badge color',
      type: 'string',
      description: 'Uses the same approved palette as Design Lab badges.',
      initialValue: 'yellow',
      options: {
        layout: 'radio',
        list: PROTOTYPE_TAG_COLORS.map((color) => ({title: colorTitle(color), value: color})),
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'text', color: 'color'},
    prepare: ({title, color}) => ({
      title: title || 'Untitled fact',
      subtitle: `${colorTitle(color || 'yellow')} badge`,
    }),
  },
})

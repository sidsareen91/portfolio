import {defineField, defineType} from 'sanity'

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Site-wide browser, search-result and social-sharing title.',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(70).warning('Search results may truncate long titles.'),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Site-wide search-result and social-sharing description.',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(180).warning('Aim for roughly 70-160 characters.'),
      ],
    }),
    defineField({
      name: 'socialImage',
      title: 'Social image',
      type: 'imagePlacement',
      description: 'Optional site-wide sharing preview. Recommended size: 1200x630. Add alternative text when supplied.',
    }),
  ],
})

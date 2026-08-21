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
      name: 'useSocialImage',
      title: 'Use social image',
      type: 'boolean',
      description: 'Enable only when you want to upload a site-wide image for social sharing.',
      initialValue: false,
      options: {layout: 'checkbox'},
    }),
    defineField({
      name: 'socialImage',
      title: 'Social image',
      type: 'imagePlacement',
      description: 'Site-wide sharing preview. Recommended size: 1200x630. Add alternative text when supplied.',
      hidden: ({parent}) => parent?.useSocialImage !== true,
      validation: (Rule) => Rule.custom((value, context) => {
        const parent = context.parent as {useSocialImage?: boolean} | undefined
        return parent?.useSocialImage !== true || value
          ? true
          : 'Upload a social image or turn off Use social image.'
      }),
    }),
  ],
})

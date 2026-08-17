import {defineField, defineType} from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'role',
      title: 'Professional role',
      type: 'string',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: 'portrait',
      title: 'Portrait',
      type: 'imagePlacement',
      description: 'The image is required. Alternative text is optional and falls back to the canonical Name.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'linkedinUrl',
      title: 'LinkedIn URL',
      type: 'url',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
    defineField({
      name: 'discordUrl',
      title: 'Discord URL',
      type: 'url',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
    defineField({
      name: 'resumeLabel',
      title: 'Resume action label',
      type: 'string',
      validation: (Rule) => Rule.max(50),
    }),
    defineField({name: 'resumeFile', title: 'Resume PDF', type: 'file', options: {accept: 'application/pdf'}}),
    defineField({
      name: 'resumeUrl',
      title: 'Resume URL or mail action',
      type: 'url',
      validation: (Rule) => Rule.uri({scheme: ['https', 'mailto']}),
    }),
    defineField({
      name: 'siteUrl',
      title: 'Production site URL',
      type: 'url',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
    defineField({
      name: 'defaultSeo',
      title: 'Global SEO',
      type: 'seo',
      description: 'The single source for site-wide search, browser and social-sharing metadata.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})

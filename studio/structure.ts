import type {StructureResolver} from 'sanity/structure'

export const singletonTypes = new Set(['siteSettings', 'homePage'])

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Portfolio content')
    .items([
      S.listItem()
        .title('Site settings')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.listItem()
        .title('Homepage')
        .id('homePage')
        .child(S.document().schemaType('homePage').documentId('homePage')),
      S.divider(),
      S.documentTypeListItem('project').title('Games'),
      S.documentTypeListItem('prototype').title('Design Lab - Content'),
    ])

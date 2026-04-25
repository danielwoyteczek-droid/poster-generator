import type { StructureResolver } from 'sanity/structure'

/**
 * Puts singletons (About, Site Settings) at the top, followed by document lists.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Inhalt')
    .items([
      S.listItem()
        .title('About-Seite')
        .id('aboutPage')
        .child(S.document().schemaType('aboutPage').documentId('aboutPage')),
      S.listItem()
        .title('Website-Einstellungen')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.divider(),
      S.documentTypeListItem('homepage').title('Homepage (pro Sprache)'),
      S.documentTypeListItem('legalPage').title('Rechtliche Seiten'),
      S.documentTypeListItem('faqItem').title('FAQ-Einträge'),
      S.documentTypeListItem('blogPost').title('Blog-Artikel'),
      S.documentTypeListItem('blogTopic').title('Blog-Themen-Queue'),
    ])

import type { SchemaTypeDefinition } from 'sanity'
import { portableText } from './schemas/portableText'
import { legalPage } from './schemas/legalPage'
import { blogPost } from './schemas/blogPost'
import { aboutPage } from './schemas/aboutPage'
import { faqItem } from './schemas/faqItem'
import { siteSettings } from './schemas/siteSettings'
import { blogTopic } from './schemas/blogTopic'
import { homepage } from './schemas/homepage'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [portableText, legalPage, blogPost, aboutPage, faqItem, siteSettings, blogTopic, homepage],
}

import type { DefinedCollection } from '@nuxt/content'
import { defineContentConfig, defineCollection, z } from '@nuxt/content'

const createPageSchema = () => z.object({
  title: z.string().optional(),
  description: z.string().optional(),
})

const collections: Record<string, DefinedCollection> = {
  docs_en: defineCollection({
    type: 'page',
    source: {
      include: 'en/**',
      prefix: '',
    },
    schema: createPageSchema(),
  }),
  docs_fr: defineCollection({
    type: 'page',
    source: {
      include: 'fr/**',
      prefix: '/fr',
    },
    schema: createPageSchema(),
  }),
}

export default defineContentConfig({ collections })

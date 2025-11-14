import type { DefinedCollection } from '@nuxt/content'
import { defineContentConfig, defineCollection, z } from '@nuxt/content'

const createDocsSchema = () => z.object({
  layout: z.string().optional(),
  links: z.array(z.object({
    label: z.string(),
    icon: z.string(),
    to: z.string(),
    target: z.string().optional(),
  })).optional(),
})

const collections: Record<string, DefinedCollection> = {
  custom: defineCollection({
    type: 'page',
    source: {
      include: '3.custom-case/**/*.md',
      prefix: '/',
    },
  }),
  landing: defineCollection({
    type: 'page',
    source: {
      include: 'index.md',
    },
  }),
  docs: defineCollection({
    type: 'page',
    source: {
      include: '**',
      exclude: ['index.md', '3.custom-case/**/*.md'],
    },
    schema: createDocsSchema(),
  }),
}

export default defineContentConfig({ collections })

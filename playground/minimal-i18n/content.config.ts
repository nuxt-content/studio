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
  docs: defineCollection({
    type: 'page',
    source: {
      include: '**',
    },
    schema: createDocsSchema(),
  }),
}

export default defineContentConfig({ collections })

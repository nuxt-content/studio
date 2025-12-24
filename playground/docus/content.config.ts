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

const createAuthorsSchema = () => z.object({
  name: z.string(),
  avatar: z.object({
    src: z.string().editor({ input: 'media' }),
    alt: z.string(),
  }),
  to: z.string(),
  username: z.string(),
  role: z.enum(['creator', 'maintainer', 'contributor']).default('contributor'),
  order: z.number().default(0),
  birthDate: z.date(),
  icon: z.string().editor({ input: 'icon', iconLibraries: ['lucide'] }),
  isOpenSourceLover: z.boolean().default(true),
  modules: z.array(z.string()),
})

const collections: Record<string, DefinedCollection> = {
  pages: defineCollection({
    type: 'page',
    source: {
      include: '3.pages/**/*.md',
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
      exclude: ['index.md', '3.pages/**/*.md', 'authors/**/*'],
    },
    schema: createDocsSchema(),
  }),
  authors: defineCollection({
    type: 'data',
    source: {
      include: 'authors/**/*',
    },
    schema: createAuthorsSchema(),
  }),
}

export default defineContentConfig({ collections })

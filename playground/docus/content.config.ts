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
    src: z.string(),
    alt: z.string(),
  }),
  to: z.string(),
  username: z.string(),
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
  datas: defineCollection({
    type: 'data',
    source: {
      include: '4.datas/**/*.md',
      prefix: '/',
    },
    schema: z.object({
      title: z.string().nonempty(),
      link: z.string().nonempty(),
      icon: z.string().nonempty().editor({ input: 'icon' }),
      image: z.string().nonempty().editor({ input: 'media' }),
      order: z.number(),
    }),
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
      exclude: ['index.md', '3.pages/**/*.md', 'authors/**/*', '4.datas/**/*.md'],
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

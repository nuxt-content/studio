import type { CollectionInfo } from '@nuxt/content'

export const collections: Record<string, CollectionInfo> = {
  landing: {
    name: 'landing',
    pascalName: 'Landing',
    tableName: '_content_landing',
    source: [
      {
        _resolved: true,
        prefix: '/',
        cwd: '/Users/larbish/Documents/nuxt/modules/studio/playground/content',
        include: 'index.md',
      },
    ],
    type: 'page',
    fields: {
      id: 'string',
      title: 'string',
      body: 'json',
      description: 'string',
      extension: 'string',
      meta: 'json',
      navigation: 'json',
      path: 'string',
      seo: 'json',
      stem: 'string',
    },
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $ref: '#/definitions/docs',
      definitions: {},
    },
    tableDefinition: '',
  },
  docs: {
    name: 'docs',
    pascalName: 'Docs',
    tableName: '_content_docs',
    source: [
      {
        _resolved: true,
        prefix: '/',
        cwd: '/Users/larbish/Documents/nuxt/modules/studio/playground/content',
        include: '**',
        exclude: [
          'index.md',
        ],
      },
    ],
    type: 'page',
    fields: {
      id: 'string',
      title: 'string',
      body: 'json',
      description: 'string',
      extension: 'string',
      links: 'json',
      meta: 'json',
      navigation: 'json',
      path: 'string',
      seo: 'json',
      stem: 'string',
    },
    schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $ref: '#/definitions/__SCHEMA__',
      definitions: {},
    },
    tableDefinition: 'CREATE TABLE IF NOT EXISTS',
  },
}

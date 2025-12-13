import type { Draft07 } from '@nuxt/content'

export const postsSchema: Draft07 = {
  $ref: '#/definitions/posts',
  definitions: {
    posts: {
      type: 'object',
      properties: {
        contentId: {
          type: 'string',
        },
        weight: {
          type: 'string',
        },
        stem: {
          type: 'string',
        },
        extension: {
          type: 'string',
          enum: [
            'md',
            'yaml',
            'json',
            'csv',
            'xml',
          ],
        },
        meta: {
          type: 'object',
          additionalProperties: {},
        },
        path: {
          type: 'string',
        },
        title: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        seo: {
          allOf: [
            {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                },
                description: {
                  type: 'string',
                },
              },
            },
            {
              type: 'object',
              additionalProperties: {},
            },
          ],
        },
        body: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
            },
            children: {},
            toc: {},
          },
          required: [
            'type',
          ],
          additionalProperties: false,
        },
        navigation: {
          anyOf: [
            {
              type: 'boolean',
            },
            {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                },
                description: {
                  type: 'string',
                },
                icon: {
                  type: 'string',
                },
              },
              required: [
                'title',
                'description',
                'icon',
              ],
              additionalProperties: false,
            },
          ],
          default: true,
        },
        authors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slug: {
                type: 'string',
              },
              name: {
                type: 'string',
              },
              to: {
                type: 'string',
              },
              avatar: {
                type: 'object',
                properties: {
                  src: {
                    type: 'string',
                  },
                  alt: {
                    type: 'string',
                  },
                },
                required: [
                  'src',
                  'alt',
                ],
                additionalProperties: false,
              },
            },
            required: [
              'slug',
              'name',
              'to',
              'avatar',
            ],
            additionalProperties: false,
          },
        },
        date: {
          type: 'string',
          format: 'date-time',
        },
        image: {
          type: 'object',
          properties: {
            src: {
              type: 'string',
            },
            alt: {
              type: 'string',
            },
          },
          required: [
            'src',
            'alt',
          ],
          additionalProperties: false,
        },
        badge: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
            },
            color: {
              type: 'string',
            },
          },
          required: [
            'label',
            'color',
          ],
          additionalProperties: false,
        },
      },
      required: [
        'contentId',
        'weight',
        'stem',
        'extension',
        'meta',
        'path',
        'title',
        'description',
        'body',
        'authors',
        'date',
        'image',
        'badge',
      ],
      additionalProperties: false,
    },
  },
  $schema: 'http://json-schema.org/draft-07/schema#',
}

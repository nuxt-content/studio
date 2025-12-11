import { expect, test, describe } from 'vitest'
import { buildFormTreeFromSchema } from '../../../src/utils/form'
import type { Draft07 } from '@nuxt/content'

describe('slugifyFileName', () => {
  test('handle array of objects with items', () => {
    const schema: Draft07 = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $ref: '#/definitions/posts',
      definitions: {
        posts: {
          type: 'object',
          properties: {
            array: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  slug: {
                    type: 'string',
                  },
                  username: {
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
                        editor: {
                          input: 'media',
                        },
                      },
                      alt: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }

    expect(buildFormTreeFromSchema('posts', schema)).toStrictEqual({
      posts: {
        id: '#frontmatter/posts',
        type: 'object',
        title: 'Posts',
        description: '',
        children: {
          array: {
            id: '#frontmatter/posts/array',
            type: 'array',
            title: 'Array',
            description: '',
            items: {
              id: '#array/items',
              type: 'object',
              title: 'Items',
              description: '',
              children: {
                slug: {
                  id: '#array/items/slug',
                  type: 'string',
                  title: 'Slug',
                  description: '',
                },
                username: {
                  id: '#array/items/username',
                  type: 'string',
                  title: 'Username',
                  description: '',
                },
                name: {
                  id: '#array/items/name',
                  type: 'string',
                  title: 'Name',
                  description: '',
                },
                to: {
                  id: '#array/items/to',
                  type: 'string',
                  title: 'To',
                  description: '',
                },
                avatar: {
                  id: '#array/items/avatar',
                  type: 'object',
                  title: 'Avatar',
                  description: '',
                  children: {
                    src: {
                      id: '#array/items/avatar/src',
                      type: 'media',
                      title: 'Src',
                      description: '',
                    },
                    alt: {
                      id: '#array/items/avatar/alt',
                      type: 'string',
                      title: 'Alt',
                      description: '',
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  })

  // test('buildFormTreeFromSchema: handle array of objects with items bis', () => {
  //   const schema: Draft07 = {
  //     $schema: 'http://json-schema.org/draft-07/schema#',
  //     $ref: '#/definitions/pricing',
  //     definitions: {
  //       pricing: {
  //         type: 'object',
  //         properties: {
  //           plans: {
  //             type: 'object',
  //             properties: {
  //               solo: {
  //                 type: 'object',
  //                 properties: {
  //                   features: {
  //                     type: 'array',
  //                     items: {
  //                       type: 'string',
  //                     },
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   }

  //   expect(buildFormTreeFromSchema('pricing', schema)).toStrictEqual({ pricing: {
  //     id: '#frontmatter/pricing',
  //     title: 'Pricing',
  //     description: '',
  //     type: 'object',
  //     children: {
  //       plans: {
  //         id: '#frontmatter/pricing/plans',
  //         title: 'Plans',
  //         description: '',
  //         type: 'object',
  //         children: {
  //           solo: {
  //             id: '#frontmatter/pricing/plans/solo',
  //             title: 'Solo',
  //             description: '',
  //             type: 'object',
  //             children: {
  //               features: {
  //                 id: '#frontmatter/pricing/plans/solo/features',
  //                 title: 'Features',
  //                 description: '',
  //                 type: 'array',
  //                 items: {
  //                   id: '#features/items',
  //                   title: 'Items',
  //                   description: '',
  //                   type: 'string',
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  //   })
  // })

  // test('buildFormTreeFromSchema: handle type creation for editor types (media, icon...) ', () => {
  //   const schema: Draft07 = {
  //     $schema: 'http://json-schema.org/draft-07/schema#',
  //     $ref: '#/definitions/posts',
  //     definitions: {
  //       posts: {
  //         type: 'object',
  //         properties: {
  //           media: {
  //             type: 'string',
  //             editor: {
  //               input: 'media',
  //             },
  //           },
  //           icon: {
  //             type: 'string',
  //             editor: {
  //               input: 'icon',
  //             },
  //           },
  //         },
  //       },
  //     },
  //   }

  //   expect(buildFormTreeFromSchema('posts', schema)).toStrictEqual({
  //     posts: {
  //       id: '#frontmatter/posts',
  //       type: 'object',
  //       title: 'Posts',
  //       description: '',
  //       children: {
  //         media: {
  //           id: '#frontmatter/posts/media',
  //           type: 'media',
  //           title: 'Media',
  //           description: '',
  //         },
  //         icon: {
  //           id: '#frontmatter/posts/icon',
  //           type: 'icon',
  //           title: 'Icon',
  //           description: '',
  //         },
  //       },
  //     },
  //   })
  // })

  // test('buildFormTreeFromSchema: hide field if set in editor metas', () => {
  //   const schema: Draft07 = {
  //     $schema: 'http://json-schema.org/draft-07/schema#',
  //     $ref: '#/definitions/posts',
  //     definitions: {
  //       posts: {
  //         type: 'object',
  //         properties: {
  //           string: {
  //             type: 'string',
  //           },
  //           hidden: {
  //             type: 'string',
  //             editor: {
  //               hidden: true,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   }

  //   expect(buildFormTreeFromSchema('posts', schema)).toStrictEqual({
  //     posts: {
  //       id: '#frontmatter/posts',
  //       type: 'object',
  //       title: 'Posts',
  //       description: '',
  //       children: {
  //         string: {
  //           id: '#frontmatter/posts/string',
  //           type: 'string',
  //           title: 'String',
  //           description: '',
  //         },
  //       },
  //     },
  //   })
  // })

  // test('buildFormTreeFromSchema: handle select type creation', () => {
  //   const schema: Draft07 = {
  //     $schema: 'http://json-schema.org/draft-07/schema#',
  //     $ref: '#/definitions/posts',
  //     definitions: {
  //       posts: {
  //         type: 'object',
  //         properties: {
  //           select: {
  //             type: 'string',
  //             enum: ['value1', 'value2'],
  //           },
  //         },
  //       },
  //     },
  //   }

  //   expect(buildFormTreeFromSchema('posts', schema)).toStrictEqual({
  //     posts: {
  //       id: '#frontmatter/posts',
  //       type: 'object',
  //       title: 'Posts',
  //       description: '',
  //       children: {
  //         select: {
  //           id: '#frontmatter/posts/select',
  //           type: 'string',
  //           title: 'Select',
  //           description: '',
  //           options: ['value1', 'value2'],
  //         },
  //       },
  //     },
  //   })
  // })

  // test('buildFormTreeFromSchema: do not handle content internal fields', () => {
  //   const schema: Draft07 = {
  //     $schema: 'http://json-schema.org/draft-07/schema#',
  //     $ref: '#/definitions/posts',
  //     definitions: {
  //       posts: {
  //         type: 'object',
  //         properties: {
  //           contentId: {
  //             type: 'string',
  //           },
  //           weight: {
  //             type: 'string',
  //           },
  //           stem: {
  //             type: 'string',
  //           },
  //           extension: {
  //             type: 'string',
  //             enum: [
  //               'md',
  //               'yaml',
  //               'json',
  //               'csv',
  //               'xml',
  //             ],
  //           },
  //           meta: {
  //             type: 'object',
  //             additionalProperties: {},
  //           },
  //           path: {
  //             type: 'string',
  //           },
  //           body: {
  //             type: 'object',
  //             properties: {
  //               type: {
  //                 type: 'string',
  //               },
  //               children: {},
  //               toc: {},
  //             },
  //             required: [
  //               'type',
  //             ],
  //             additionalProperties: false,
  //           },
  //           string: {
  //             type: 'string',
  //           },
  //         },
  //       },
  //     },
  //   }

  //   expect(buildFormTreeFromSchema('posts', schema)).toStrictEqual({
  //     posts: {
  //       id: '#frontmatter/posts',
  //       type: 'object',
  //       title: 'Posts',
  //       description: '',
  //       children: {
  //         string: {
  //           id: '#frontmatter/posts/string',
  //           type: 'string',
  //           title: 'String',
  //           description: '',
  //         },
  //       },
  //     },
  //   })
  // })

  // test('buildFormTreeFromSchema: handle two level deep object with `allOff` property', () => {
  //   const schema: Draft07 = {
  //     $schema: 'http://json-schema.org/draft-07/schema#',
  //     $ref: '#/definitions/posts',
  //     definitions: {
  //       posts: {
  //         type: 'object',
  //         properties: {
  //           seo: {
  //             allOf: [
  //               {
  //                 type: 'object',
  //                 properties: {
  //                   title: {
  //                     type: 'string',
  //                   },
  //                   description: {
  //                     type: 'string',
  //                   },
  //                 },
  //               },
  //               {
  //                 type: 'object',
  //                 additionalProperties: {},
  //               },
  //             ],
  //           },
  //         },
  //       },
  //     },
  //   }

  //   expect(buildFormTreeFromSchema('posts', schema)).toStrictEqual({
  //     posts: {
  //       id: '#frontmatter/posts',
  //       type: 'object',
  //       title: 'Posts',
  //       description: '',
  //       children: {
  //         seo: {
  //           id: '#frontmatter/posts/seo',
  //           type: 'object',
  //           title: 'Seo',
  //           description: '',
  //           children: {
  //             title: {
  //               id: '#frontmatter/posts/seo/title',
  //               type: 'string',
  //               title: 'Title',
  //               description: '',
  //             },
  //             description: {
  //               id: '#frontmatter/posts/seo/description',
  //               type: 'string',
  //               title: 'Description',
  //               description: '',
  //             },
  //           },
  //         },
  //       },
  //     },
  //   })
  // })

  // test('buildFormTreeFromSchema: handle two level deep object with `anyOf` property and prioritize string type', () => {
  //   const schema: Draft07 = {
  //     $schema: 'http://json-schema.org/draft-07/schema#',
  //     $ref: '#/definitions/posts',
  //     definitions: {
  //       posts: {
  //         type: 'object',
  //         properties: {
  //           navigation: {
  //             anyOf: [
  //               {
  //                 type: 'string',
  //                 enum: ['value1', 'value2'],
  //               },
  //               {
  //                 type: 'boolean',
  //               },
  //             ],
  //             default: false,
  //           },
  //         },
  //       },
  //     },
  //   }

  //   expect(buildFormTreeFromSchema('posts', schema)).toStrictEqual({
  //     posts: {
  //       id: '#frontmatter/posts',
  //       type: 'object',
  //       title: 'Posts',
  //       description: '',
  //       children: {
  //         navigation: {
  //           id: '#frontmatter/posts/navigation',
  //           type: 'string',
  //           toggleable: true,
  //           title: 'Navigation',
  //           description: '',
  //           options: ['value1', 'value2'],
  //         },
  //       },
  //     },
  //   })
  // })

  // test('buildFormTreeFromSchema: handle two level deep object with `anyOf` property and prioritize object type', () => {
  //   const schema: Draft07 = {
  //     $schema: 'http://json-schema.org/draft-07/schema#',
  //     $ref: '#/definitions/posts',
  //     definitions: {
  //       posts: {
  //         type: 'object',
  //         properties: {
  //           navigation: {
  //             anyOf: [
  //               {
  //                 type: 'boolean',
  //               },
  //               {
  //                 type: 'object',
  //                 properties: {
  //                   title: {
  //                     type: 'string',
  //                   },
  //                   description: {
  //                     type: 'string',
  //                   },
  //                   icon: {
  //                     type: 'string',
  //                   },
  //                 },
  //                 required: [
  //                   'title',
  //                   'description',
  //                   'icon',
  //                 ],
  //                 additionalProperties: false,
  //               },
  //             ],
  //             default: true,
  //           },
  //         },
  //       },
  //     },
  //   }

  //   expect(buildFormTreeFromSchema('posts', schema)).toStrictEqual({
  //     posts: {
  //       id: '#frontmatter/posts',
  //       type: 'object',
  //       title: 'Posts',
  //       description: '',
  //       children: {
  //         navigation: {
  //           id: '#frontmatter/posts/navigation',
  //           type: 'object',
  //           title: 'Navigation',
  //           description: '',
  //           toggleable: true,
  //           children: {
  //             title: {
  //               id: '#frontmatter/posts/navigation/title',
  //               type: 'string',
  //               title: 'Title',
  //               description: '',
  //             },
  //             description: {
  //               id: '#frontmatter/posts/navigation/description',
  //               type: 'string',
  //               title: 'Description',
  //               description: '',
  //             },
  //             icon: {
  //               id: '#frontmatter/posts/navigation/icon',
  //               type: 'string',
  //               title: 'Icon',
  //               description: '',
  //             },
  //           },
  //         },
  //       },
  //     },
  //   })
  // })

  // test('buildFormTreeFromSchema: handle three level deep object', () => {
  //   const schema: Draft07 = {
  //     $schema: 'http://json-schema.org/draft-07/schema#',
  //     $ref: '#/definitions/posts',
  //     definitions: {
  //       posts: {
  //         type: 'object',
  //         properties: {
  //           hero: {
  //             type: 'object',
  //             properties: {
  //               title: {
  //                 type: 'string',
  //               },
  //               description: {
  //                 type: 'string',
  //               },
  //               image: {
  //                 type: 'object',
  //                 properties: {
  //                   dark: {
  //                     type: 'string',
  //                   },
  //                   light: {
  //                     type: 'string',
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   }

  //   expect(buildFormTreeFromSchema('posts', schema)).toStrictEqual({
  //     posts: {
  //       id: '#frontmatter/posts',
  //       type: 'object',
  //       title: 'Posts',
  //       description: '',
  //       children: {
  //         hero: {
  //           id: '#frontmatter/posts/hero',
  //           type: 'object',
  //           title: 'Hero',
  //           description: '',
  //           children: {
  //             title: {
  //               id: '#frontmatter/posts/hero/title',
  //               type: 'string',
  //               title: 'Title',
  //               description: '',
  //             },
  //             description: {
  //               id: '#frontmatter/posts/hero/description',
  //               type: 'string',
  //               title: 'Description',
  //               description: '',
  //             },
  //             image: {
  //               id: '#frontmatter/posts/hero/image',
  //               type: 'object',
  //               title: 'Image',
  //               description: '',
  //               children: {
  //                 dark: {
  //                   id: '#frontmatter/posts/hero/image/dark',
  //                   type: 'string',
  //                   title: 'Dark',
  //                   description: '',
  //                 },
  //                 light: {
  //                   id: '#frontmatter/posts/hero/image/light',
  //                   type: 'string',
  //                   title: 'Light',
  //                   description: '',
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   })
  // })
})

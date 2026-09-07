import { test, describe, expect } from 'vitest'
import { contentFromDocument, documentFromContent } from '../../../module/dist/runtime/utils/document'
import type { JSONContent } from '@tiptap/core'
import type { DatabasePageItem } from '../../src/types'
import { createMockDocument } from '../mocks/document'
import { comarkToTiptap } from '../../src/utils/tiptap/comarkToTiptap'
import { tiptapToComark } from '../../src/utils/tiptap/tiptapToComark'
import type { MarkdownDocument, Node as MarkdownNode } from 'comark'
import shiki, { resetHighlighter } from 'comark/plugins/shiki'
import { roundTripThroughEditor } from '../utils/editor'

describe('paragraph', () => {
  test('simple paragraph', async () => {
    const inputContent = 'This is a simple paragraph'

    const expectedComarkNodes = [
      ['p', {}, 'This is a simple paragraph'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'This is a simple paragraph' },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('horizontal rule', async () => {
    const inputContent = '---'

    const expectedComarkNodes = [
      ['hr', {}],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'horizontalRule',
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('external link', async () => {
    const inputContent = '[Link](https://example.com)'

    const expectedComarkNodes = [
      ['p', {}, ['a', { href: 'https://example.com' }, 'Link']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'paragraph',
          attrs: {},
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://example.com',
                    target: '_blank',
                    rel: 'noopener noreferrer nofollow',
                  },
                },
              ],
              text: 'Link',
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('relative link', async () => {
    const inputContent = '[Link](/test)'

    const expectedComarkNodes = [
      ['p', {}, ['a', { href: '/test' }, 'Link']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'paragraph',
          attrs: {},
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: '/test',
                  },
                },
              ],
              text: 'Link',
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('external link with target="_blank" removes target', async () => {
    const inputContent = '[link](https://external.com){target="_blank"}'

    const expectedComarkNodes = [
      ['p', {}, ['a', { href: 'https://external.com', target: '_blank' }, 'link']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'paragraph',
          attrs: {},
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://external.com',
                    target: '_blank',
                    rel: 'noopener noreferrer nofollow',
                  },
                },
              ],
              text: 'link',
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    // After roundtrip, target is stripped for external links (it's auto-added by TipTap, not user-authored)
    const expectedRtComarkNodes = [
      ['p', {}, ['a', { href: 'https://external.com' }, 'link']],
    ]
    expect(rtComarkTree.nodes).toMatchObject(expectedRtComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    // Expected output should NOT have target="_blank" for external links
    expect(outputContent).toBe('[link](https://external.com)\n')
  })

  test('link with non-default attr order preserves order through round-trip', async () => {
    const inputContent = '[link](/relative){.my-class target="_blank"}'

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const tiptapJSON: JSONContent = comarkToTiptap(document.body)
    const rtTree = await tiptapToComark(tiptapJSON)

    const originalRender = await contentFromDocument(
      createMockDocument('docs/test.md', { body: document.body, ...document.body.frontmatter }),
    )
    const modifiedRender = await contentFromDocument(
      createMockDocument('docs/test.md', { body: rtTree, ...rtTree.frontmatter }),
    )
    expect(originalRender).toBe(modifiedRender)
  })

  test('relative link with target="_blank" keeps target', async () => {
    const inputContent = '[link](/relative){target="_blank"}'

    const expectedComarkNodes = [
      ['p', {}, ['a', { href: '/relative', target: '_blank' }, 'link']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'paragraph',
          attrs: {},
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: '/relative',
                    target: '_blank',
                  },
                },
              ],
              text: 'link',
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    // Expected output SHOULD keep target="_blank" for relative links
    expect(outputContent).toBe(`${inputContent}\n`)
  })
})

describe('frontmatter', () => {
  test('simple frontmatter with title and description', async () => {
    const inputContent = `---
title: Test Page
description: This is a test
---

This is content`

    const expectedFrontmatterJson = {
      title: 'Test Page',
      description: 'This is a test',
    }

    const expectedComarkNodes = [
      ['p', {}, 'This is content'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: expectedFrontmatterJson,
          },
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'This is content' },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    expect(document.title).toBe('Test Page')
    expect(document.description).toBe('This is a test')

    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)
    expect(rtComarkTree.frontmatter).toMatchObject(expectedFrontmatterJson)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })
})

describe('elements', () => {
  test('block element with named default slot', async () => {
    const inputContent = `::block-element
#default
Hello
::`

    // comark preserves named default slot as template with { name: 'default' }
    const expectedComarkNodes = [
      ['block-element', {}, ['template', { name: 'default' }, 'Hello']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'element',
          attrs: {
            tag: 'block-element',
          },
          content: [
            {
              type: 'slot',
              attrs: {
                name: 'default',
              },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Hello',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    // Comark strips the #default slot
    expect(rtComarkTree.nodes).toMatchObject([['block-element', {}, 'Hello']])

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    // Idem for output content (comark strips the #default slot)
    expect(outputContent).toBe('::block-element\nHello\n::\n')
  })

  test('block element with unnamed default slot', async () => {
    const inputContent = `::block-element
Hello
::`

    // comark with autoUnwrap strips the paragraph wrapper, leaving a direct string child
    const expectedComarkNodes = [
      ['block-element', {}, 'Hello'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'element',
          attrs: {
            tag: 'block-element',
            props: {
              __tiptapWrap: true, // This is added by comarkToTiptap to wrap the content in a paragraph
            },
          },
          content: [
            {
              type: 'slot',
              attrs: {
                name: 'default',
              },
              content: [
                {
                  type: 'paragraph',
                  attrs: {},
                  content: [
                    {
                      type: 'text',
                      text: 'Hello',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('block element with named custom slot', async () => {
    const inputContent = `::block-element
#custom
Hello
::`

    // comark uses { name: 'xxx' } format for template slot attrs
    const expectedComarkNodes = [
      ['block-element', {}, ['template', { name: 'custom' }, 'Hello']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'element',
          attrs: {
            tag: 'block-element',
          },
          content: [
            {
              type: 'slot',
              attrs: {
                name: 'custom',
              },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Hello',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('block element with unwrap="p" on slot names', async () => {
    const inputContent = `::u-page-feature
#title{unwrap="p"}
Visual Editor

#description{unwrap="p"}
Edit pages visually without touching code.
::`

    const expectedComarkNodes = [
      [
        'u-page-feature',
        {},
        ['template', { name: 'title', unwrap: 'p' }, 'Visual Editor'],
        ['template', { name: 'description', unwrap: 'p' }, 'Edit pages visually without touching code.'],
      ],
    ]

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('block element nested in other block element', async () => {
    const inputContent = `::first-level-element
  :::second-level-element
  Hello
  :::
::`

    const expectedComarkNodes = [
      ['first-level-element', {}, ['second-level-element', {}, 'Hello']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'element',
          attrs: {
            tag: 'first-level-element',
          },
          content: [
            {
              type: 'slot',
              attrs: {
                name: 'default',
              },
              content: [
                {
                  type: 'element',
                  attrs: {
                    tag: 'second-level-element',
                  },
                  content: [
                    {
                      type: 'slot',
                      attrs: {
                        name: 'default',
                      },
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            { type: 'text', text: 'Hello' },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('block element with boolean props', async () => {
    const inputContent = `::u-button{block :square="false"}
My button
::`

    const expectedComarkNodes = [
      ['u-button', { ':block': 'true', ':square': 'false' }, 'My button'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'element',
          attrs: {
            tag: 'u-button',
            props: {
              ':block': 'true',
              ':square': 'false',
              '__tiptapWrap': true,
            },
          },
          content: [
            {
              type: 'slot',
              attrs: {
                name: 'default',
              },
              content: [
                {
                  type: 'paragraph',
                  attrs: {},
                  content: [
                    {
                      type: 'text',
                      text: 'My button',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('block element with number and string props', async () => {
    const inputContent = `::u-button{:width="200" color="secondary"}
My button
::`

    const expectedComarkNodes = [
      ['u-button', { ':width': '200', 'color': 'secondary' }, 'My button'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'element',
          attrs: {
            tag: 'u-button',
            props: {
              ':width': '200',
              'color': 'secondary',
              '__tiptapWrap': true,
            },
          },
          content: [
            {
              type: 'slot',
              attrs: {
                name: 'default',
              },
              content: [
                {
                  type: 'paragraph',
                  attrs: {},
                  content: [
                    {
                      type: 'text',
                      text: 'My button',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('block element with inline class attributes and default content', async () => {
    const inputContent = `::u-button{.any-class}
My button
::`

    const expectedComarkNodes = [
      ['u-button', { class: 'any-class' }, 'My button'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'element',
          attrs: {
            tag: 'u-button',
            props: { class: 'any-class', __tiptapWrap: true },
          },
          content: [
            {
              type: 'slot',
              attrs: { name: 'default' },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'My button' }],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('block element with inline class attributes and multiple sloted content', async () => {
    const inputContent = `::u-button{.any-class}
My button

#icon
My icon
::`

    const expectedComarkNodes = [
      ['u-button', { class: 'any-class' },
        ['p', {}, 'My button'],
        ['template', { name: 'icon' }, 'My icon'],
      ],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'element',
          attrs: {
            tag: 'u-button',
            props: { class: 'any-class' },
          },
          content: [
            {
              type: 'slot',
              attrs: { name: 'default' },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'My button' }],
                },
              ],
            },
            {
              type: 'slot',
              attrs: { name: 'icon' },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'My icon' }],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('block element link as default and multiple sloted content', async () => {
    const inputContent = [
      '::code-preview',
      '[Installation](/getting-started/installation)',
      '',
      '#code',
      '```mdc',
      '[Installation](/getting-started/installation)',
      '```',
      '::',
    ].join('\n')

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('block element with inline code as default and multiple sloted content', async () => {
    const inputContent = [
      '::code-preview',
      '`inline code`',
      '',
      '#code',
      '`inline code`',
      '::',
    ].join('\n')

    const expectedComarkNodes = [
      ['code-preview', {},
        ['p', {}, ['code', {}, 'inline code']],
        ['template', { name: 'code' }, ['code', {}, 'inline code']],
      ],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'element',
          attrs: { tag: 'code-preview' },
          content: [
            {
              type: 'slot',
              attrs: { name: 'default' },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'inline code', marks: [{ type: 'code' }] },
                  ],
                },
              ],
            },
            {
              type: 'slot',
              attrs: { name: 'code' },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'inline code', marks: [{ type: 'code' }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('inline element', async () => {
    const inputContent = 'This is a :badge component'

    const expectedComarkNodes = [
      ['p', {}, 'This is a ', ['badge', {}], ' component'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is a ',
            },
            {
              type: 'inline-element',
              attrs: {
                tag: 'badge',
              },
            },
            {
              type: 'text',
              text: ' component',
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('hard break serializes as a markdown hard break through roundtrip', async () => {
    const inputContent = 'Hello :br world'

    const expectedComarkNodes = [
      ['p', {}, 'Hello ', ['br', {}], ' world'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'hardBreak' },
            { type: 'text', text: ' world' },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe('Hello   \n world\n')
  })

  test('inline element with slot content', async () => {
    const inputContent = 'This a :badge[New] component with slots'

    const expectedComarkNodes = [
      ['p', {}, 'This a ', ['badge', {}, 'New'], ' component with slots'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This a ',
            },
            {
              type: 'inline-element',
              attrs: {
                tag: 'badge',
              },
              content: [
                {
                  type: 'text',
                  text: 'New',
                },
              ],
            },
            {
              type: 'text',
              text: ' component with slots',
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })
})

describe('callout', () => {
  test('note callout produces slot-wrapped structure like element', async () => {
    const inputContent = `::note
Content here
::`

    const expectedComarkNodes = [
      ['note', {}, 'Content here'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        { type: 'frontmatter', attrs: { frontmatter: {} } },
        {
          type: 'u-callout',
          attrs: { tag: 'note' },
          content: [
            {
              type: 'slot',
              attrs: { name: 'default' },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Content here' }],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree, { hasNuxtUI: true })
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('tip callout produces slot-wrapped structure', async () => {
    const inputContent = `::tip
A helpful tip
::`

    const expectedComarkNodes = [
      ['tip', {}, 'A helpful tip'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        { type: 'frontmatter', attrs: { frontmatter: {} } },
        {
          type: 'u-callout',
          attrs: { tag: 'tip' },
          content: [
            {
              type: 'slot',
              attrs: { name: 'default' },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'A helpful tip' }],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree, { hasNuxtUI: true })
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('callout with custom props preserves props in slot-wrapped structure', async () => {
    const inputContent = `::note{icon="i-lucide-star"}
Custom icon callout
::`

    const expectedComarkNodes = [
      ['note', { icon: 'i-lucide-star' }, 'Custom icon callout'],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        { type: 'frontmatter', attrs: { frontmatter: {} } },
        {
          type: 'u-callout',
          attrs: {
            tag: 'note',
            props: { icon: 'i-lucide-star' },
          },
          content: [
            {
              type: 'slot',
              attrs: { name: 'default' },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Custom icon callout' }],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree, { hasNuxtUI: true })
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('warning and caution types are parsed to u-callout node with slot structure', async () => {
    for (const type of ['warning', 'caution'] as const) {
      const inputContent = `::${type}\nDanger zone\n::`

      const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
      const tiptapJSON: JSONContent = comarkToTiptap(document.body, { hasNuxtUI: true })

      expect(tiptapJSON.content?.[1]).toMatchObject({
        type: 'u-callout',
        attrs: { tag: type },
        content: [
          {
            type: 'slot',
            attrs: { name: 'default' },
            content: [{ type: 'paragraph' }],
          },
        ],
      })
    }
  })
})

describe('code block', () => {
  test('code block preserves space indentation when loaded from Shiki-highlighted MDC', async () => {
    const inputContent = 'function hello() {\n  console.log(\'world\')\n}'

    const expectedComarkNodes: MarkdownNode[] = [
      ['pre', { language: 'ts', code: inputContent }],
    ]

    const comarkTreeInput: MarkdownDocument = {
      nodes: expectedComarkNodes,
      frontmatter: {},
      meta: {},
    }

    const tiptapJSON = comarkToTiptap(comarkTreeInput)

    // The codeBlock node must contain the full original code, with newlines and indentation
    expect(tiptapJSON.content?.[1]).toMatchObject({
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'function hello() {\n  console.log(\'world\')\n}' }],
    })
  })

  test('code block preserves tab indentation when loaded from Shiki-highlighted MDC', async () => {
    // Same bug: Shiki expands \t to spaces in its token spans, so reading back from
    // Shiki spans loses the original tab characters. props.code stores the raw code.
    const inputContent = 'function hello() {\n\tconsole.log(\'world\')\n}'

    const expectedComarkNodes: MarkdownNode[] = [
      ['pre', { language: 'ts', code: inputContent }],
    ]

    const comarkTreeInput: MarkdownDocument = {
      nodes: expectedComarkNodes,
      frontmatter: {},
      meta: {},
    }

    const tiptapJSON = comarkToTiptap(comarkTreeInput)

    // The codeBlock node must contain the original tab character from props.code,
    // not the 4 spaces that Shiki used in its token spans
    expect(tiptapJSON.content?.[1]).toMatchObject({
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'function hello() {\n\tconsole.log(\'world\')\n}' }],
    })
  })

  test('code block containing triple backticks is serialized with tilde fences', async () => {
    const inputContent = [
      '````mdc',
      '```bash',
      'npx install',
      '```',
      '````',
    ].join('\n')

    const expectedOutput = [
      '~~~mdc',
      '```bash',
      'npx install',
      '```',
      '~~~',
      '',
    ].join('\n')

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body

    const tiptapJSON = comarkToTiptap(comarkTree)
    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(expectedOutput)
  })

  test('code block with tilde fence containing triple backticks roundtrips correctly', async () => {
    const inputContent = [
      '~~~mdc',
      '```bash',
      'npx install',
      '```',
      '~~~',
    ].join('\n')

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body

    const tiptapJSON = comarkToTiptap(comarkTree)
    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('bare fence with no language round-trips without gaining a language', async () => {
    const inputContent = '```\nassets/\n  icons/\n    my-logo.svg\n```\n'

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body

    const tiptapJSON = comarkToTiptap(comarkTree)
    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(inputContent)
  })

  test('simple code block highlighting', async () => {
    const inputContent = 'console.log("Hello, world!");'

    const comarkTreeInput: MarkdownDocument = {
      nodes: [['pre', { language: 'javascript' }, ['code', {}, inputContent]]],
      frontmatter: {},
      meta: {},
    }

    const tiptapJSON = comarkToTiptap(comarkTreeInput)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON, { highlightTheme: { default: 'github-light', dark: 'github-dark' } })
    const preNode = rtComarkTree.nodes[0]

    // Tags: pre -> code -> line -> span -> text
    expect(preNode[0]).toBe('pre')
    // expect(preNode[1].language).toBe('javascript')
    // expect(preNode[1].code).toBe('console.log("Hello, world!");')
    // expect(preNode[1].className).toBe('shiki shiki-themes github-light github-dark')

    // Note we don't check the styles and colors because they are generated by Shiki and we don't want to test Shiki here
  })

  test('Shiki-highlighted code block serializes to a plain fence (single theme, no ::pre wrapper)', async () => {
    // Reset the singleton a prior test's failed theme load may have poisoned; only `material-theme-*` preloads.
    resetHighlighter()
    const inputContent = 'function hello() {\n  console.log(\'world\')\n}'
    const expectedOutput = `\`\`\`ts\n${inputContent}\n\`\`\`\n`

    const document = await documentFromContent('test.md', `\`\`\`ts\n${inputContent}\n\`\`\``) as DatabasePageItem
    const tiptapJSON = comarkToTiptap(document.body)
    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON, { highlightTheme: { default: 'material-theme-lighter', dark: 'material-theme-lighter' } })

    const preNode = rtComarkTree.nodes[0] as MarkdownNode & unknown[]
    // a span array (not a raw string) proves Shiki actually ran rather than hitting its catch
    expect(Array.isArray((preNode[2] as unknown[])[2])).toBe(true)
    // raw source on the pre attrs would force a `::pre{code=…}` wrapper
    expect((preNode[1] as Record<string, unknown>).code).toBeUndefined()

    const generatedDocument = createMockDocument('docs/test.md', { body: rtComarkTree, ...rtComarkTree.frontmatter })
    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).not.toContain('::pre')
    expect(outputContent).toBe(expectedOutput)
  })

  test('Shiki-highlighted code block serializes to a plain fence (dual theme, no ::pre wrapper)', async () => {
    resetHighlighter()
    const inputContent = 'function hello() {\n  console.log(\'world\')\n}'
    const expectedOutput = `\`\`\`ts\n${inputContent}\n\`\`\`\n`

    const document = await documentFromContent('test.md', `\`\`\`ts\n${inputContent}\n\`\`\``) as DatabasePageItem
    const tiptapJSON = comarkToTiptap(document.body)
    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON, { highlightTheme: { default: 'material-theme-lighter', dark: 'material-theme-palenight' } })

    const preNode = rtComarkTree.nodes[0] as MarkdownNode & unknown[]
    expect(Array.isArray((preNode[2] as unknown[])[2])).toBe(true)

    const generatedDocument = createMockDocument('docs/test.md', { body: rtComarkTree, ...rtComarkTree.frontmatter })
    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).not.toContain('::pre')
    expect(outputContent).toBe(expectedOutput)
  })

  test('Shiki-highlighted code block preserves tab indentation through full round-trip', async () => {
    resetHighlighter()
    const inputContent = 'function hello() {\n\tconsole.log(\'world\')\n}'
    const expectedOutput = `\`\`\`ts\n${inputContent}\n\`\`\`\n`

    const document = await documentFromContent('test.md', `\`\`\`ts\n${inputContent}\n\`\`\``) as DatabasePageItem
    const tiptapJSON = comarkToTiptap(document.body)
    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON, { highlightTheme: { default: 'material-theme-lighter', dark: 'material-theme-palenight' } })

    const preNode = rtComarkTree.nodes[0] as MarkdownNode & unknown[]
    expect(Array.isArray((preNode[2] as unknown[])[2])).toBe(true)

    const generatedDocument = createMockDocument('docs/test.md', { body: rtComarkTree, ...rtComarkTree.frontmatter })
    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).not.toContain('::pre')
    expect(outputContent).toBe(expectedOutput)
  })
})

describe('inline code', () => {
  test('inline code with language attribute - `code`{lang="ts"}', async () => {
    const inputContent = '`const foo = "bar"`{lang="ts"}'

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'const foo = "bar"',
              marks: [{ type: 'code', attrs: { language: 'ts' } }],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('inline code language is preserved when Shiki runs with a real theme', async () => {
    const inputContent = '`const foo = "bar"`{lang="ts"}'

    const { parseMarkdown } = await import('comark')
    const themes: Record<string, string> = { default: 'github-light', dark: 'github-dark' }
    const tree = await parseMarkdown(inputContent, {
      plugins: [shiki({ themes })],
    })

    // After Shiki, the `language` prop must still be present so comarkToTiptap can preserve it.
    // Full roundtrip: load the Shiki-processed tree into TipTap then back to markdown
    const tiptapJSON = comarkToTiptap(tree)
    expect(tiptapJSON.content![1].content![0].marks![0]).toEqual({ type: 'code', attrs: { language: 'ts' } })

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })
    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('inline code with already-corrupted Shiki classes is cleaned up on roundtrip', async () => {
    const inputContent = '`docus`{.shiki,shiki-themes,material-theme-lighter,material-theme,material-theme-palenight lang="ts"}'

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)

    // Despite the corrupted input, TipTap should only carry `language` in the code mark attrs
    expect(tiptapJSON).toMatchObject({
      type: 'doc',
      content: [
        { type: 'frontmatter', attrs: { frontmatter: {} } },
        {
          type: 'paragraph',
          content: [{
            type: 'text',
            text: 'docus',
            marks: [{ type: 'code', attrs: { language: 'ts' } }],
          }],
        },
      ],
    })

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    // The output should be clean — no Shiki classes in the markdown
    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe('`docus`{lang="ts"}\n')
  })

  test('inline code with already-corrupted Shiki classes and real Shiki theme', async () => {
    const inputContent = '`docus`{.shiki,shiki-themes,material-theme-lighter,material-theme,material-theme-palenight lang="ts"}'

    const { parseMarkdown } = await import('comark')
    const themes: Record<string, string> = { default: 'github-light', dark: 'github-dark' }
    const tree = await parseMarkdown(inputContent, {
      plugins: [shiki({ themes })],
    })

    const tiptapJSON = comarkToTiptap(tree)
    expect(tiptapJSON.content![1].content![0].marks![0]).toEqual({ type: 'code', attrs: { language: 'ts' } })

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })
    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe('`docus`{lang="ts"}\n')
  })
})

describe('images', () => {
  test('simple image', async () => {
    const inputContent = '![Alt text](https://example.com/image.jpg)'

    const expectedComarkNodes = [
      ['p', {}, ['img', { src: 'https://example.com/image.jpg', alt: 'Alt text' }]],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'image',
              attrs: {
                props: {
                  src: 'https://example.com/image.jpg',
                  alt: 'Alt text',
                },
              },
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('image with title', async () => {
    const inputContent = '![Alt text](https://example.com/image.jpg "Image title")'

    const expectedComarkNodes = [
      ['p', {}, ['img', { src: 'https://example.com/image.jpg', alt: 'Alt text', title: 'Image title' }]],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'image',
              attrs: {
                props: {
                  src: 'https://example.com/image.jpg',
                  alt: 'Alt text',
                  title: 'Image title',
                },
              },
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('image with width and height', async () => {
    const inputContent = '![Alt text](https://example.com/image.jpg){width="800" height="600"}'

    // comark parses all attribute values as strings
    const expectedComarkNodes = [
      ['p', {}, ['img', { src: 'https://example.com/image.jpg', alt: 'Alt text', width: '800', height: '600' }]],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'image',
              attrs: {
                props: {
                  src: 'https://example.com/image.jpg',
                  alt: 'Alt text',
                  width: '800',
                  height: '600',
                },
              },
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })
})

describe('videos', () => {
  test('simple video with controls', async () => {
    const inputContent = ':video{controls src="https://example.com/video.mp4"}'

    // After roundtrip through tiptap, tiptapToComark normalizes booleans to colon-prefix for correct MDC serialization
    const expectedComarkNodes = [
      ['video', { ':controls': 'true', 'src': 'https://example.com/video.mp4' }],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'video',
          attrs: {
            props: {
              controls: true,
              src: 'https://example.com/video.mp4',
            },
          },
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    // Inline :video is serialized as block ::video after roundtrip
    expect(outputContent).toBe('::video{controls src="https://example.com/video.mp4"}\n::\n')
  })

  test('video with poster', async () => {
    const inputContent = ':video{controls poster="https://example.com/poster.jpg" src="https://example.com/video.mp4"}'

    // After roundtrip through tiptap, tiptapToComark normalizes booleans to colon-prefix for correct MDC serialization
    const expectedComarkNodes = [
      ['video', {
        ':controls': 'true',
        'poster': 'https://example.com/poster.jpg',
        'src': 'https://example.com/video.mp4',
      }],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'video',
          attrs: {
            props: {
              controls: true,
              poster: 'https://example.com/poster.jpg',
              src: 'https://example.com/video.mp4',
            },
          },
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    // Inline :video is serialized as block ::video after roundtrip
    expect(outputContent).toBe('::video{controls poster="https://example.com/poster.jpg" src="https://example.com/video.mp4"}\n::\n')
  })

  test('video with loop and muted', async () => {
    const inputContent = ':video{controls loop muted poster="https://example.com/poster.jpg" src="https://example.com/video.mp4"}'

    // After roundtrip through tiptap, tiptapToComark normalizes booleans to colon-prefix for correct MDC serialization
    const expectedComarkNodes = [
      [
        'video',
        {
          ':controls': 'true',
          ':loop': 'true',
          ':muted': 'true',
          'poster': 'https://example.com/poster.jpg',
          'src': 'https://example.com/video.mp4',
        },
      ],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'video',
          attrs: {
            props: {
              controls: true,
              loop: true,
              muted: true,
              poster: 'https://example.com/poster.jpg',
              src: 'https://example.com/video.mp4',
            },
          },
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    // Video is serialized as block element with YAML props block when there are more than 3 props.
    const res = [
      '::video',
      '---',
      'controls: true',
      'loop: true',
      'muted: true',
      'poster: https://example.com/poster.jpg',
      'src: https://example.com/video.mp4',
      '---',
      '::',
      '',
    ]
    expect(outputContent).toBe(res.join('\n'))
  })
})

describe('marks', () => {
  test('bold text - **x**', async () => {
    const inputContent = '**x**'

    const expectedComarkNodes = [
      ['p', {}, ['strong', {}, 'x']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'bold' }],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('italic text - *x*', async () => {
    const inputContent = '*x*'

    const expectedComarkNodes = [
      ['p', {}, ['em', {}, 'x']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'italic' }],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('bold and italic text - ***x***', async () => {
    const inputContent = '***x***'

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'bold' }, { type: 'italic' }],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('nested bold in italic - *y **x***', async () => {
    const inputContent = '*y **x***'

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'y ',
              marks: [{ type: 'italic' }],
            },
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'bold' }, { type: 'italic' }],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('nested italic in bold - ***x** y*', async () => {
    const inputContent = '***x** y*'

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'bold' }, { type: 'italic' }],
            },
            {
              type: 'text',
              text: ' y',
              marks: [{ type: 'italic' }],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('inline code in bold - **`x`**', async () => {
    const inputContent = '**`x`**'

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'code' }, { type: 'bold' }],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const rtComarkTree = await tiptapToComark(tiptapJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('strikethrough text - ~~x~~', async () => {
    const inputContent = '~~x~~'

    const expectedComarkNodes = [
      ['p', {}, ['del', {}, 'x']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'strike' }],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('bold in strikethrough - ~~**x**~~', async () => {
    const inputContent = '~~**x**~~'

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'bold' }, { type: 'strike' }],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('bold wrapping a link - ** markers do not accumulate on repeated round-trips', async () => {
    const inputContent = '**that contain it **[here](/miscellaneous/bugs)**.**'
    const expectedCanonicalOutput = '**that contain it [here](/miscellaneous/bugs).**\n'

    const expectedRtComarkNodes = [
      ['p', {}, ['strong', {}, 'that contain it ', ['a', { href: '/miscellaneous/bugs' }, 'here'], '.']],
    ]

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const tiptapJSON: JSONContent = comarkToTiptap(document.body)
    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    // Round-tripped AST: one strong wrapping text + link + text
    expect(rtComarkTree.nodes).toMatchObject(expectedRtComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })
    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(expectedCanonicalOutput)

    // Idempotency: a second round-trip must produce byte-identical output (no ** growth)
    const document2 = await documentFromContent('test.md', outputContent.trimEnd()) as DatabasePageItem
    const tiptapJSON2: JSONContent = comarkToTiptap(document2.body)
    const editorJSON2 = roundTripThroughEditor(tiptapJSON2)
    const rtComarkTree2 = await tiptapToComark(editorJSON2)
    const generatedDocument2 = createMockDocument('docs/test.md', {
      body: rtComarkTree2,
      ...rtComarkTree2.frontmatter,
    })
    const outputContent2 = await contentFromDocument(generatedDocument2)
    expect(outputContent2).toBe(expectedCanonicalOutput)
  })

  test('inline code in bold and strikethrough - ~~**`x`**~~', async () => {
    const inputContent = '~~**`x`**~~'

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'code' }, { type: 'bold' }, { type: 'strike' }],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const rtComarkTree = await tiptapToComark(tiptapJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })
})

describe('text styles', () => {
  test('inline text with multiple classes', async () => {
    const inputContent = 'Welcome to [site]{.bg-gradient-to-r.from-primary-600.to-purple-600.bg-clip-text.text-transparent}'

    // REGRESSION: comark only retains the last dot-class from chained class syntax (.class1.class2...)
    // All classes except the last one (.text-transparent) are lost during parsing.
    // This is a known comark limitation compared to the previous MDC parser behavior.
    const expectedComarkNodes = [
      ['p', {}, 'Welcome to ', ['span', { class: 'bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent' }, 'site']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: { frontmatter: {} },
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Welcome to ' },
            {
              type: 'span-style',
              attrs: {
                class: 'bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent',
              },
              content: [
                { type: 'text', text: 'site' },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })
})

describe('edge cases', () => {
  test('div element with text and blockquote', async () => {
    const inputContent = `::div
text 1

> text 2
::`

    const expectedComarkNodes = [
      ['div', {}, ['p', {}, 'text 1'], ['blockquote', {}, 'text 2']],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'element',
          attrs: {
            tag: 'div',
          },
          content: [
            {
              type: 'slot',
              attrs: {
                name: 'default',
              },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'text 1',
                    },
                  ],
                },
                {
                  type: 'blockquote',
                  content: [
                    {
                      type: 'text',
                      text: 'text 2',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('image after heading inside component maintains correct order', async () => {
    const inputContent = `::steps
### Step 1

![Image](https://example.com/image.jpg)
::`

    const expectedComarkNodes = [
      ['steps', {}, ['h3', {}, 'Step 1'], ['p', {}, ['img', { src: 'https://example.com/image.jpg', alt: 'Image' }]]],
    ]

    const expectedTiptapJSON: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'frontmatter',
          attrs: {
            frontmatter: {},
          },
        },
        {
          type: 'element',
          attrs: {
            tag: 'steps',
          },
          content: [
            {
              type: 'slot',
              attrs: {
                name: 'default',
              },
              content: [
                {
                  type: 'heading',
                  attrs: {
                    level: 3,
                  },
                  content: [
                    {
                      type: 'text',
                      text: 'Step 1',
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'image',
                      attrs: {
                        props: {
                          src: 'https://example.com/image.jpg',
                          alt: 'Image',
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)
    expect(outputContent).toBe(`${inputContent}\n`)

    // Custom case also valid when image is not enclosed in a paragraph
    const bisCmarkTree: MarkdownDocument = {
      nodes: [
        ['steps', {}, ['h3', {}, 'Step 1'], ['img', { src: 'https://example.com/image.jpg', alt: 'Image' }]],
      ] as MarkdownNode[],
      frontmatter: {},
      meta: {},
    }

    const generatedDocumentBis = createMockDocument('docs/test.md', {
      body: bisCmarkTree,
    })

    const outputContentBis = await contentFromDocument(generatedDocumentBis)
    expect(outputContentBis).toBe(`${inputContent}\n`)
  })
})

describe('YAML array-of-objects props round-trip', () => {
  test('block element with YAML array-of-objects props round-trips correctly', async () => {
    const inputContent = `::authors
---
authorsOne:
  - name: John Doe One
    avatar: https://placehold.co/150
    role: contributor
authorsTwo:
  - name: Jane Doe Two
    avatar: https://placehold.co/150
    role: maintainer
---
::`

    const expectedComarkNodes = [
      [
        'authors',
        {
          ':authorsOne': [{ name: 'John Doe One', avatar: 'https://placehold.co/150', role: 'contributor' }],
          ':authorsTwo': [{ name: 'Jane Doe Two', avatar: 'https://placehold.co/150', role: 'maintainer' }],
        },
      ],
    ]

    const document = await documentFromContent('test.md', inputContent) as DatabasePageItem
    const comarkTree = document.body

    // AST must contain actual objects, not JSON strings
    expect(comarkTree.nodes).toMatchObject(expectedComarkNodes)

    const tiptapJSON: JSONContent = comarkToTiptap(comarkTree)

    // TipTap attrs.props must still hold actual objects (not "[object Object]")
    const elementNode = tiptapJSON.content?.find(n => n.type === 'element')
    expect(elementNode?.attrs?.props?.[':authorsOne']).toEqual([
      { name: 'John Doe One', avatar: 'https://placehold.co/150', role: 'contributor' },
    ])

    const editorJSON = roundTripThroughEditor(tiptapJSON)
    const rtComarkTree = await tiptapToComark(editorJSON)

    // After round-trip the AST must still hold actual objects
    expect(rtComarkTree.nodes).toMatchObject(expectedComarkNodes)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: rtComarkTree,
      ...rtComarkTree.frontmatter,
    })

    const outputContent = await contentFromDocument(generatedDocument)

    // Output must use YAML block syntax, not inline JSON strings
    expect(outputContent).toBe(`${inputContent}\n`)
  })
})

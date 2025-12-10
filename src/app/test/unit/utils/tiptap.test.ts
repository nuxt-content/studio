import { test, describe, expect } from 'vitest'
import { tiptapToMDC } from '../../../src/utils/tiptap/tiptapToMdc'
import { generateContentFromDocument, generateDocumentFromContent } from '../../../../module/dist/runtime/utils/document'
import type { JSONContent } from '@tiptap/core'
import { mdcToTiptap } from '../../../src/utils/tiptap/mdcToTiptap'
import type { DatabasePageItem } from '../../../src/types'
import type { MDCRoot } from '@nuxtjs/mdc'
import type { MarkdownRoot } from '@nuxt/content'
import { createMockDocument } from '../../mocks/document'

describe('paragraph', () => {
  test('simple paragraph', async () => {
    const inputContent = 'This is a simple paragraph'

    const expectedMDCJSON: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'p',
          children: [
            { type: 'text', value: 'This is a simple paragraph' },
          ],
          props: {},
        },
      ],
    }

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

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem
    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, {})
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON)
    expect(generatedMdcJSON.body).toMatchObject(expectedMDCJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: generatedMdcJSON.body as unknown as MarkdownRoot,
      ...generatedMdcJSON.data,
    })

    const outputContent = await generateContentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('horizontal rule', async () => {
    const inputContent = '---'

    const expectedMDCJSON: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'hr',
          children: [],
          props: {},
        },
      ],
    }

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

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem
    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, {})
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON)
    expect(generatedMdcJSON.body).toMatchObject(expectedMDCJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: generatedMdcJSON.body as unknown as MarkdownRoot,
      ...generatedMdcJSON.data,
    })

    const outputContent = await generateContentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('external link', async () => {
    const inputContent = '[Link](https://example.com)'

    const expectedMDCJSON: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'p',
          props: {},
          children: [
            {
              type: 'element',
              tag: 'a',
              props: {
                href: 'https://example.com',
              },
              children: [
                {
                  type: 'text',
                  value: 'Link',
                },
              ],
            },
          ],
        },
      ],
    }

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

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem
    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, {})
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON)
    expect(generatedMdcJSON.body).toMatchObject(expectedMDCJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: generatedMdcJSON.body as unknown as MarkdownRoot,
      ...generatedMdcJSON.data,
    })

    const outputContent = await generateContentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('relative link', async () => {
    const inputContent = '[Link](/test)'

    const expectedMDCJSON: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'p',
          props: {},
          children: [
            {
              type: 'element',
              tag: 'a',
              props: {
                href: '/test',
              },
              children: [
                {
                  type: 'text',
                  value: 'Link',
                },
              ],
            },
          ],
        },
      ],
    }

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

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem
    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, {})
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON)
    expect(generatedMdcJSON.body).toMatchObject(expectedMDCJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: generatedMdcJSON.body as unknown as MarkdownRoot,
      ...generatedMdcJSON.data,
    })

    const outputContent = await generateContentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('inline component', async () => {
    const inputContent = 'This is a :badge component'

    const expectedMDCJSON: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'p',
          props: {},
          children: [
            {
              type: 'text',
              value: 'This is a ',
            },
            {
              type: 'element',
              tag: 'badge',
              props: {},
              children: [],
            },
            {
              type: 'text',
              value: ' component',
            },
          ],
        },
      ],
    }

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

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem
    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, {})
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON)
    expect(generatedMdcJSON.body).toMatchObject(expectedMDCJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: generatedMdcJSON.body as unknown as MarkdownRoot,
      ...generatedMdcJSON.data,
    })

    const outputContent = await generateContentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('inline component with slot content', async () => {
    const inputContent = 'This a :badge[New] component with slots'

    const expectedMDCJSON: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'p',
          props: {},
          children: [
            {
              type: 'text',
              value: 'This a ',
            },
            {
              type: 'element',
              tag: 'badge',
              props: {},
              children: [
                {
                  type: 'text',
                  value: 'New',
                },
              ],
            },
            {
              type: 'text',
              value: ' component with slots',
            },
          ],
        },
      ],
    }

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

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem
    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, {})
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON)
    expect(generatedMdcJSON.body).toMatchObject(expectedMDCJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: generatedMdcJSON.body as unknown as MarkdownRoot,
      ...generatedMdcJSON.data,
    })

    const outputContent = await generateContentFromDocument(generatedDocument)

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

    const expectedMDCJSON: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'p',
          props: {},
          children: [
            { type: 'text', value: 'This is content' },
          ],
        },
      ],
    }

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

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem
    expect(document.title).toBe('Test Page')
    expect(document.description).toBe('This is a test')

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, expectedFrontmatterJson)
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON)
    expect(generatedMdcJSON.body).toMatchObject(expectedMDCJSON)
    expect(generatedMdcJSON.data).toMatchObject(expectedFrontmatterJson)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: generatedMdcJSON.body as unknown as MarkdownRoot,
      ...generatedMdcJSON.data,
    })

    const outputContent = await generateContentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })
})

describe('elements', () => {
  test('block element with named default slot', async () => {
    const inputContent = `::block-element
#default
Hello
::`

    const expectedMDCJSON: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'block-element',
          props: {},
          children: [
            {
              type: 'text',
              value: 'Hello',
            },
          ],
        },
      ],
    }

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
              __tiptapWrap: true, // This is added by mdcToTiptap to wrap the content in a paragraph
            },
          },
          content: [
            {
              type: 'slot',
              attrs: {
                name: 'default',
                props: {
                  'v-slot:default': '',
                },
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

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem

    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, {})
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON)
    expect(generatedMdcJSON.body).toMatchObject(expectedMDCJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: generatedMdcJSON.body as unknown as MarkdownRoot,
      ...generatedMdcJSON.data,
    })

    const outputContent = await generateContentFromDocument(generatedDocument)

    // Remove #default slot and move children at root
    const expectedOutputContent = `::block-element
Hello
::`

    expect(outputContent).toBe(`${expectedOutputContent}\n`)
  })

  test('block element with unnamed default slot', async () => {
    const inputContent = `::block-element
Hello
::`

    const expectedMDCJSON: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'block-element',
          props: {},
          children: [
            {
              type: 'text',
              value: 'Hello',
            },
          ],
        },
      ],
    }

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
              __tiptapWrap: true, // This is added by mdcToTiptap to wrap the content in a paragraph
            },
          },
          content: [
            {
              type: 'slot',
              attrs: {
                name: 'default',
                props: {
                  'v-slot:default': '',
                },
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

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem

    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, {})
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON)
    expect(generatedMdcJSON.body).toMatchObject(expectedMDCJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: generatedMdcJSON.body as unknown as MarkdownRoot,
      ...generatedMdcJSON.data,
    })

    const outputContent = await generateContentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('block element with named custom slot', async () => {
    const inputContent = `::block-element
#custom
Hello
::`

    const expectedMDCJSON: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'block-element',
          children: [
            {
              type: 'element',
              tag: 'template',
              children: [
                {
                  type: 'text',
                  value: 'Hello',
                },
              ],
              props: {
                'v-slot:custom': '',
              },
            },
          ],
          props: {},
        },
      ],
    }

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
                props: {
                  'v-slot:custom': '',
                },
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
    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem

    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, {})
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON)
    expect(generatedMdcJSON.body).toMatchObject(expectedMDCJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: generatedMdcJSON.body as unknown as MarkdownRoot,
      ...generatedMdcJSON.data,
    })

    const outputContent = await generateContentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })

  test('block element nested in other block element', async () => {
    const inputContent = `::first-level-element
  :::second-level-element
  Hello
  :::
::`

    const expectedMDCJSON: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'first-level-element',
          props: {},
          children: [
            {
              type: 'element',
              tag: 'second-level-element',
              props: {},
              children: [
                {
                  type: 'text',
                  value: 'Hello',
                },
              ],
            },
          ],
        },
      ],
    }

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
                props: {
                  'v-slot:default': '',
                },
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
                        props: {
                          'v-slot:default': '',
                        },
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

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem

    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, {})
    expect(tiptapJSON).toMatchObject(expectedTiptapJSON)

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON)
    expect(generatedMdcJSON.body).toMatchObject(expectedMDCJSON)

    const generatedDocument = createMockDocument('docs/test.md', {
      body: generatedMdcJSON.body as unknown as MarkdownRoot,
      ...generatedMdcJSON.data,
    })

    const outputContent = await generateContentFromDocument(generatedDocument)

    expect(outputContent).toBe(`${inputContent}\n`)
  })
})

describe('code block', () => {
  test('simple code block highlighting', async () => {
    const mdcInput: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'pre',
          props: {
            language: 'javascript',
          },
          children: [
            {
              type: 'element',
              tag: 'code',
              props: {},
              children: [{ type: 'text', value: 'console.log("Hello, world!");' }],
            },
          ],
        },
      ],
    }

    const tiptapJSON = await mdcToTiptap(mdcInput, {})

    const generatedMdcJSON = await tiptapToMDC(tiptapJSON, { highlightTheme: { default: 'github-light', dark: 'github-dark' } })
    const pre = generatedMdcJSON.body.children[0] as JSONContent

    // Tags: pre -> code -> line -> span -> text
    expect(pre.tag).toBe('pre')
    expect(pre.children.length).toBe(1)
    expect(pre.children[0].tag).toBe('code')
    expect(pre.props.language).toBe('javascript')
    expect(pre.props.code).toBe('console.log("Hello, world!");')
    expect(pre.props.className).toBe('shiki shiki-themes github-light github-dark')

    const code = pre.children[0] as JSONContent
    const line0 = code.children[0] as JSONContent

    // Make sure the line is parsed correctly
    expect(line0.children.length).toBe(5) // console. -- log -- ( -- "Hello, world!" -- );
    for (const child of line0.children) {
      expect(child.tag).toBe('span')
      expect(child.children.length).toBe(1)
      expect(child.children[0].type).toBe('text')
      expect(child.props.style.includes('--shiki-default:')).toBeTruthy()
    }

    // Note we don't check the styles and colors because they are generated by Shiki and we don't want to test Shiki here
  })
})

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
          type: 'paragraph',
          content: [
            { type: 'text', text: 'This is a simple paragraph' },
          ],
        },
      ],
    }

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem
    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, '')
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
          type: 'horizontalRule',
        },
      ],
    }

    const document = await generateDocumentFromContent('test.md', inputContent, { compress: false }) as DatabasePageItem
    expect(document.body).toMatchObject(expectedMDCJSON)

    const tiptapJSON: JSONContent = await mdcToTiptap(document.body as unknown as MDCRoot, '')
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
// describe('marks', () => {
//   test('***x** y*', async () => {
//     const inputContent = '***x** y*'
//     const mdc = await generateDocumentFromContent('test.md', inputContent) as DatabasePageItem

//     const tiptapJSON: JSONContent = await mdcToTiptap(mdc.body as unknown as MDCRoot, '')
//     const mdcJSON = await tiptapToMDC(tiptapJSON)

//     const document = {
//       id: 'test.md',
//       stem: 'test',
//       extension: 'md',
//       meta: {},
//       body: mdcJSON.body as unknown as MarkdownRoot,
//       ...mdcJSON.data,
//     } as DatabasePageItem

//     const outputContent = await generateContentFromDocument(document)

//     expect(outputContent).toBe(inputContent)
//   })

//   test('*y **x***', async () => {
//     const mdc = await markdownToMDC('*y **x***')

//     const tiptap = await mdcToTiptap(mdc['body'], mdc['frontmatter'] || {})
//     const out = await tiptapToMDC(tiptap)

//     const stringify = useMDCMarkdownGenerator()
//     const markdown = await stringify.generate(out.body)

//     expect(markdown.trim()).toBe('*y **x***')
//   })

//   test('**x**', async () => {
//     const mdc = await markdownToMDC('**x**')

//     const tiptap = await mdcToTiptap(mdc['body'], mdc['frontmatter'] || {})
//     const out = await tiptapToMDC(tiptap)

//     const stringify = useMDCMarkdownGenerator()
//     const markdown = await stringify.generate(out.body)

//     expect(markdown.trim()).toBe('**x**')
//   })

//   test('**`x`**', async () => {
//     const mdc = await markdownToMDC('**`x`**')

//     const tiptap = await mdcToTiptap(mdc['body'], mdc['frontmatter'] || {})
//     const out = await tiptapToMDC(tiptap)

//     const stringify = useMDCMarkdownGenerator()
//     const markdown = await stringify.generate(out.body)

//     expect(markdown.trim()).toBe('**`x`**')
//   })

//   test('~~**x**~~', async () => {
//     const mdc = await markdownToMDC('~~**x**~~')

//     const tiptap = await mdcToTiptap(mdc['body'], mdc['frontmatter'] || {})
//     const out = await tiptapToMDC(tiptap)

//     const stringify = useMDCMarkdownGenerator()
//     const markdown = await stringify.generate(out.body)

//     expect(markdown.trim()).toBe('~~**x**~~')
//   })

//   // ~~**`x`**~~
//   test('~~**`x`**~~', async () => {
//     const mdc = await markdownToMDC('~~**`x`**~~')

//     const tiptap = await mdcToTiptap(mdc['body'], mdc['frontmatter'] || {})
//     const out = await tiptapToMDC(tiptap)

//     const stringify = useMDCMarkdownGenerator()
//     const markdown = await stringify.generate(out.body)

//     expect(markdown.trim()).toBe('~~**`x`**~~')
//   })
// })

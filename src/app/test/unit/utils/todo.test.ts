import { test, describe, expect } from 'vitest'

describe('todo', () => {
  test('todo', () => {
    expect(true).toBe(true)
  })
})

// describe('marks', () => {
//   test('***x** y*', async () => {
//     const mdc = await markdownToMDC('***x** y*')

//     const tiptap = await mdcToTiptap(mdc['body'], mdc['frontmatter'] || {})
//     const out = await tiptapToMDC(tiptap)

//     const stringify = useMDCMarkdownGenerator()
//     const markdown = await stringify.generate(out.body)

//     expect(markdown.trim()).toBe('***x** y*')
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

// test('*y **x***', async () => {
//   const mdc = await markdownToMDC('*y **x***')

//   const tiptap = await mdcToTiptap(mdc['body'], mdc['frontmatter'] || {})

//   const paragraph = tiptap.content[1]
//   expect(paragraph.type).toBe('paragraph')
//   const y = paragraph.content[0]
//   expect(y.type).toBe('text')
//   expect(y.text).toBe('y ')
//   expect(y.marks.map(m => m.type)).toEqual(['italic'])

//   const x = paragraph.content[1]
//   expect(x.type).toBe('text')
//   expect(x.text).toBe('x')
//   expect(x.marks.map(m => m.type)).toEqual(['bold', 'italic'])
// })

// test('**x**', async () => {
//   const mdc = await markdownToMDC('**x**')

//   const tiptap = await mdcToTiptap(mdc['body'], mdc['frontmatter'] || {})

//   const paragraph = tiptap.content[1]
//   expect(paragraph.type).toBe('paragraph')
//   const x = paragraph.content[0]
//   expect(x.type).toBe('text')
//   expect(x.text).toBe('x')
//   expect(x.marks.map(m => m.type)).toEqual(['bold'])
// })

// test('**`x`**', async () => {
//   const mdc = await markdownToMDC('**`x`**')

//   const tiptap = await mdcToTiptap(mdc['body'], mdc['frontmatter'] || {})

//   const paragraph = tiptap.content[1]
//   expect(paragraph.type).toBe('paragraph')
//   const x = paragraph.content[0]
//   expect(x.type).toBe('text')
//   expect(x.text).toBe('x')
//   expect(x.marks.map(m => m.type)).toEqual(['code', 'bold'])
// })

// test('~**x**~', async () => {
//   const mdc = await markdownToMDC('~**x**~')

//   const tiptap = await mdcToTiptap(mdc['body'], mdc['frontmatter'] || {})

//   const paragraph = tiptap.content[1]
//   expect(paragraph.type).toBe('paragraph')
//   const x = paragraph.content[0]
//   expect(x.type).toBe('text')
//   expect(x.text).toBe('x')
//   expect(x.marks.map(m => m.type)).toEqual(['bold', 'strike'])
// })

// // ~**`x`**~
// test('~**`x`**~', async () => {
//   const mdc = await markdownToMDC('~**`x`**~')

//   const tiptap = await mdcToTiptap(mdc['body'], mdc['frontmatter'] || {})

//   const paragraph = tiptap.content[1]
//   expect(paragraph.type).toBe('paragraph')
//   const x = paragraph.content[0]
//   expect(x.type).toBe('text')
//   expect(x.text).toBe('x')
//   expect(x.marks.map(m => m.type)).toEqual(['code', 'bold', 'strike'])
// })

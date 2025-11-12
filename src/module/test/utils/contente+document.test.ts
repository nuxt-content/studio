import { describe, it, expect } from 'vitest'
import { isDocumentMatchContent } from '../../src/runtime/utils/document'

describe('Content + Document', () => {
  it('should be true', async () => {
    const markdownContent = `Hello`

    const document = {
      id: 'docs/1.getting-started/test.md',
      title: 'Test',
      body: {
        type: 'minimark',
        value: [
          [
            'p',
            {},
            'Hello',
          ],
        ],
        toc: {
          title: '',
          searchDepth: 2,
          depth: 2,
          links: [],
        },
      },
      description: 'Hello',
      extension: 'md',
      layout: null,
      links: null,
      meta: {},
      navigation: true,
      path: '/getting-started/test',
      seo: {
        title: 'Test',
        description: 'Hello',
      },
      stem: '1.getting-started/test',
      __hash__: 'FORE7RbeCNfOhf3pzpQ6iehsHwCfTab-N64UgQZUOIg',
      fsPath: '1.getting-started/test.md',
    }
    const _isDocumentMatchContent = await isDocumentMatchContent(markdownContent, document)

    expect(_isDocumentMatchContent).toBe(true)
  })

  it('should be true for fallback title and description', async () => {
    const markdownContent = `
# Hello

Description`

    const document = {
      id: 'docs/1.getting-started/test.md',
      title: 'Hello',
      body: {
        type: 'minimark',
        value: [
          [
            'h1',
            {
              id: 'hello',
            },
            'Hello',
          ],
          [
            'p',
            {},
            'Description',
          ],
        ],
        toc: {
          title: '',
          searchDepth: 2,
          depth: 2,
          links: [],
        },
      },
      description: 'Description',
      extension: 'md',
      layout: null,
      links: null,
      meta: {},
      navigation: true,
      path: '/getting-started/test',
      seo: {
        title: 'Hello',
        description: 'Description',
      },
      stem: '1.getting-started/test',
      __hash__: 'gaOnNORwr1k3a615yjZjMBMBc_KE4FlOETknzMqD884',
      fsPath: '1.getting-started/test.md',
    }

    const _isDocumentMatchContent = await isDocumentMatchContent(markdownContent, document)
    expect(_isDocumentMatchContent).toBe(true)
  })

  it('should be true for Seo', async () => {
    const markdownContent = `---
seo:
  title: 'Seo Hello'
  description: 'Seo Description'
---
# Hello

Description`

    const document = {
      id: 'docs/1.getting-started/test.md',
      title: 'Hello',
      body: {
        type: 'minimark',
        value: [
          [
            'h1',
            {
              id: 'hello',
            },
            'Hello',
          ],
          [
            'p',
            {},
            'Description',
          ],
        ],
        toc: {
          title: '',
          searchDepth: 2,
          depth: 2,
          links: [],
        },
      },
      description: 'Description',
      extension: 'md',
      layout: null,
      links: null,
      meta: {},
      navigation: true,
      path: '/getting-started/test',
      seo: {
        title: 'Seo Hello',
        description: 'Seo Description',
      },
      stem: '1.getting-started/test',
      __hash__: 'gaOnNORwr1k3a615yjZjMBMBc_KE4FlOETknzMqD884',
      fsPath: '1.getting-started/test.md',
    }

    const _isDocumentMatchContent = await isDocumentMatchContent(markdownContent, document)
    expect(_isDocumentMatchContent).toBe(true)
  })
})

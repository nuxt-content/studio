import { describe, it, expect } from 'vitest'
import { areDocumentsEqual, isDocumentMatchingContent } from '../../src/runtime/utils/document'
import { ContentFileExtension } from '../../src/types/content'
import type { DatabasePageItem } from 'nuxt-studio/app'

describe('areDocumentsEqual', () => {
  it('should return true for two identical markdown documents with diffrent hash', () => {
    const document1: DatabasePageItem = {
      id: 'content:index.md',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extension: ContentFileExtension.Markdown,
      stem: 'index',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Hello World'],
      },
      meta: {
        __hash__: 'hash123',
      },
    }

    const document2: DatabasePageItem = {
      id: 'content:index.md',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extension: ContentFileExtension.Markdown,
      stem: 'index',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Hello World'],
      },
      meta: {
        __hash__: 'hash456',
      },
    }

    expect(areDocumentsEqual(document1, document2)).toBe(true)
  })

  it('should return false for two different markdown documents', () => {
    const document1: DatabasePageItem = {
      id: 'content:index.md',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extension: ContentFileExtension.Markdown,
      stem: 'index',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Hello World'],
      },
      meta: {
        title: 'Test Document',
      },
    }

    const document2: DatabasePageItem = {
      id: 'content:index.md',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extension: ContentFileExtension.Markdown,
      stem: 'index',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Different content'],
      },
      meta: {
        title: 'Test Document',
      },
    }

    expect(areDocumentsEqual(document1, document2)).toBe(false)
  })

  it('should return true for two identical yaml document with different order of keys', () => {
    const document1: DatabasePageItem = {
      extension: ContentFileExtension.YAML,
      description: 'A test document',
      title: 'Test Document',
      path: '/index',
      stem: 'index.yml',
      id: 'content:index.yml',
      tags: ['tag1', 'tag2'],
      seo: {},
      body: {
        type: 'minimark',
        value: ['Different content'],
      },
      meta: {
        title: 'Test Document',
      },
    }

    const document2: DatabasePageItem = {
      id: 'content:index.yml',
      stem: 'index.yml',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extension: ContentFileExtension.YAML,
      tags: ['tag1', 'tag2'],
      seo: {},
      body: {
        type: 'minimark',
        value: ['Different content'],
      },
      meta: {
        title: 'Test Document',
      },
    }

    expect(areDocumentsEqual(document1, document2)).toBe(true)
  })

  it('should return true if one document has extra key with null/undefined value', () => {
    const document1: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      stem: 'index.yml',
      extension: 'yml',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Different content'],
      },
      meta: {
        title: 'Test Document',
      },
    }
    const document2: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extra: null,
      stem: 'index.yml',
      extension: 'yml',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Different content'],
      },
      meta: {
        title: 'Test Document',
      },
    }
    expect(areDocumentsEqual(document1, document2)).toBe(true)
  })

  it('should ignore null/undefined values', () => {
    const document1: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: null as never,
      stem: 'index.yml',
      extension: 'yml',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Same content'],
      },
      meta: {
        title: 'Test Document',
      },
    }

    const document2: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: undefined as never,
      stem: 'index.yml',
      extension: 'yml',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Same content'],
      },
      meta: {
        title: 'Test Document',
      },
    }

    expect(areDocumentsEqual(document1, document2)).toBe(true)
  })

  it('should return false if one of documents missing a key', () => {
    const document1: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      stem: 'index.yml',
      extension: 'yml',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Different content'],
      },
      meta: {
        title: 'Test Document',
      },
    }
    const document2 = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      extension: 'yml',
      stem: 'index.yml',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Different content'],
      },
      meta: {
        title: 'Test Document',
      },
    } as never as DatabasePageItem

    expect(areDocumentsEqual(document1, document2)).toBe(false)
  })

  it('should return false if array values are different', () => {
    const document1: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      tags: ['tag1', 'tag2'],
      stem: 'index.yml',
      extension: 'yml',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Different content'],
      },
      meta: {
        title: 'Test Document',
      },
    }

    const document2: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      tags: ['tag1', 'tag3'],
      title: 'Test Document',
      description: 'A test document',
      stem: 'index.yml',
      extension: 'yml',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Different content'],
      },
      meta: {
        title: 'Test Document',
      },
    }

    expect(areDocumentsEqual(document1, document2)).toBe(false)
  })

  it('should return true if date values are same but different format', () => {
    const document1: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      date: '2025-11-04',
      description: 'A test document',
      stem: 'index.yml',
      extension: 'yml',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Different content'],
      },
      meta: {
        title: 'Test Document',
      },
    }
    const document2: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      date: '2025-11-04T00:00:00.000Z',
      description: 'A test document',
      stem: 'index.yml',
      extension: 'yml',
      seo: {},
      body: {
        type: 'minimark',
        value: ['Different content'],
      },
      meta: {
        title: 'Test Document',
      },
    }

    expect(areDocumentsEqual(document1, document2)).toBe(true)
  })
})

describe('isDocumentMatchingContent', () => {
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
    const _isDocumentMatchingContent = await isDocumentMatchingContent(markdownContent, document)

    expect(_isDocumentMatchingContent).toBe(true)
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

    const _isDocumentMatchingContent = await isDocumentMatchingContent(markdownContent, document)
    expect(_isDocumentMatchingContent).toBe(true)
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

    const _isDocumentMatchingContent = await isDocumentMatchingContent(markdownContent, document)
    expect(_isDocumentMatchingContent).toBe(true)
  })
})

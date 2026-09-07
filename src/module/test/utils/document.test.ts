import { describe, it, expect } from 'vitest'
import { applyCollectionSchema, areDocumentsEqual, isDocumentMatchingContent, sanitizeDocumentTree } from '../../src/runtime/utils/document'
import { ContentFileExtension } from '../../src/types/content'
import type { DatabaseItem } from 'nuxt-studio/app'
import type { CollectionInfo } from '@nuxt/content'

describe('areDocumentsEqual', () => {
  it('should return true for two identical markdown documents with diffrent hash', async () => {
    const document1: DatabaseItem = {
      id: 'content:index.md',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extension: ContentFileExtension.Markdown,
      stem: 'index',
      seo: {},
      body: { nodes: [['p', {}, 'Hello World']], frontmatter: {}, meta: {} },
      meta: {
        __hash__: 'hash123',
      },
    }

    const document2: DatabaseItem = {
      id: 'content:index.md',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extension: ContentFileExtension.Markdown,
      stem: 'index',
      seo: {},
      body: { nodes: [['p', {}, 'Hello World']], frontmatter: {}, meta: {} },
      meta: {
        __hash__: 'hash456',
      },
    }

    expect(await areDocumentsEqual(document1, document2)).toBe(true)
  })

  it('should return false for two different markdown documents', async () => {
    const document1: DatabaseItem = {
      id: 'content:index.md',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extension: ContentFileExtension.Markdown,
      stem: 'index',
      seo: {},
      body: { nodes: [['p', {}, 'Hello World']], frontmatter: {}, meta: {} },
      meta: {
        title: 'Test Document',
      },
    }

    const document2: DatabaseItem = {
      id: 'content:index.md',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extension: ContentFileExtension.Markdown,
      stem: 'index',
      seo: {},
      body: { nodes: [['p', {}, 'Different content']], frontmatter: {}, meta: {} },
      meta: {
        title: 'Test Document',
      },
    }

    expect(await areDocumentsEqual(document1, document2)).toBe(false)
  })

  it('should return true for two identical yaml document with different order of keys', async () => {
    const document1: DatabaseItem = {
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

    const document2: DatabaseItem = {
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

    expect(await areDocumentsEqual(document1, document2)).toBe(true)
  })

  it('should return true if one document has extra key with null/undefined value', async () => {
    const document1: DatabaseItem = {
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
    const document2: DatabaseItem = {
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
    expect(await areDocumentsEqual(document1, document2)).toBe(true)
  })

  it('should ignore null/undefined values', async () => {
    const document1: DatabaseItem = {
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

    const document2: DatabaseItem = {
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

    expect(await areDocumentsEqual(document1, document2)).toBe(true)
  })

  it('should return false if one of documents missing a key', async () => {
    const document1: DatabaseItem = {
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
    } as never as DatabaseItem

    expect(await areDocumentsEqual(document1, document2)).toBe(false)
  })

  it('should return false if array values are different', async () => {
    const document1: DatabaseItem = {
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

    const document2: DatabaseItem = {
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

    expect(await areDocumentsEqual(document1, document2)).toBe(false)
  })

  it('should return true if date values are same but different format', async () => {
    const document1: DatabaseItem = {
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
    const document2: DatabaseItem = {
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

    expect(await areDocumentsEqual(document1, document2)).toBe(true)
  })
})

describe('isDocumentMatchingContent', () => {
  it('should be true', async () => {
    const markdownContent = `Hello`

    const document = {
      id: 'docs/1.getting-started/test.md',
      title: '',
      body: { nodes: [['p', {}, 'Hello']], frontmatter: {}, meta: {} },
      description: 'Hello',
      extension: 'md',
      layout: null,
      links: null,
      meta: {},
      navigation: true,
      path: '/getting-started/test',
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
      body: { nodes: [['h1', { id: 'hello' }, 'Hello'], ['p', {}, 'Description']], frontmatter: {}, meta: {} },
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
      body: { nodes: [['h1', { id: 'hello' }, 'Hello'], ['p', {}, 'Description']], frontmatter: {}, meta: {} },
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

  it('should be true when stored body and source markdown only differ in attribute order', async () => {
    const markdownContent = `::card{orientation="horizontal" .text-primary}\nHello\n::\n`

    const document = {
      id: 'docs/test.md',
      title: '',
      body: {
        nodes: [['card', { class: 'text-primary', orientation: 'horizontal' }, ['p', {}, 'Hello']]],
        frontmatter: {},
        meta: {},
      },
      description: '',
      extension: 'md',
      layout: null,
      links: null,
      meta: {},
      navigation: true,
      path: '/test',
      stem: 'test',
      fsPath: 'test.md',
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(markdownContent, document)
    expect(result).toBe(true)
  })

  it('should be true when the source markdown marks the default slot explicitly', async () => {
    const markdownContent = `::card{orientation="horizontal"}\n#default\n  :::icon{name="rocket"}\n  :::\n\n#body\nSome text.\n::\n`

    const document = {
      id: 'docs/test.md',
      title: '',
      body: {
        nodes: [[
          'card',
          { orientation: 'horizontal' },
          ['icon', { name: 'rocket' }],
          ['template', { name: 'body' }, 'Some text.'],
        ]],
        frontmatter: {},
        meta: {},
      },
      description: '',
      extension: 'md',
      layout: null,
      links: null,
      meta: {},
      navigation: true,
      path: '/test',
      stem: 'test',
      fsPath: 'test.md',
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(markdownContent, document)
    expect(result).toBe(true)
  })

  it('should be true when a nested block marks the default slot explicitly', async () => {
    const markdownContent = `::card\n  :::note\n  #default\n  Para one.\n\n  Para two.\n\n  #body\n  Body text.\n  :::\n::\n`

    const document = {
      id: 'docs/test.md',
      title: '',
      body: {
        nodes: [[
          'card',
          {},
          ['note', {}, ['p', {}, 'Para one.'], ['p', {}, 'Para two.'], ['template', { name: 'body' }, 'Body text.']],
        ]],
        frontmatter: {},
        meta: {},
      },
      description: '',
      extension: 'md',
      layout: null,
      links: null,
      meta: {},
      navigation: true,
      path: '/test',
      stem: 'test',
      fsPath: 'test.md',
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(markdownContent, document)
    expect(result).toBe(true)
  })

  it('should still be false when a default slot marker follows a named slot', async () => {
    // Without the marker the trailing content parses into the preceding `#body` slot.
    const markdownContent = `::card\n#body\nBody text.\n\n#default\nDefault text.\n::\n`

    const document = {
      id: 'docs/test.md',
      title: '',
      body: {
        nodes: [[
          'card',
          {},
          ['template', { name: 'body' }, ['p', {}, 'Body text.']],
          ['p', {}, 'Default text.'],
        ]],
        frontmatter: {},
        meta: {},
      },
      description: '',
      extension: 'md',
      layout: null,
      links: null,
      meta: {},
      navigation: true,
      path: '/test',
      stem: 'test',
      fsPath: 'test.md',
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(markdownContent, document)
    expect(result).toBe(false)
  })

  it('should still be false when the default slot marker carries attributes', async () => {
    const markdownContent = `::card\n#default{.text-primary}\nHello\n\n#body\nBody text.\n::\n`

    const document = {
      id: 'docs/test.md',
      title: '',
      body: {
        nodes: [['card', {}, ['p', {}, 'Hello'], ['template', { name: 'body' }, 'Body text.']]],
        frontmatter: {},
        meta: {},
      },
      description: '',
      extension: 'md',
      layout: null,
      links: null,
      meta: {},
      navigation: true,
      path: '/test',
      stem: 'test',
      fsPath: 'test.md',
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(markdownContent, document)
    expect(result).toBe(false)
  })

  it('should still be false when content actually differs', async () => {
    const markdownContent = `::card{orientation="horizontal"}\nHello\n::\n`

    const document = {
      id: 'docs/test.md',
      title: '',
      body: {
        nodes: [['card', { orientation: 'vertical' }, ['p', {}, 'Hello']]],
        frontmatter: {},
        meta: {},
      },
      description: '',
      extension: 'md',
      layout: null,
      links: null,
      meta: {},
      navigation: true,
      path: '/test',
      stem: 'test',
      fsPath: 'test.md',
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(markdownContent, document)
    expect(result).toBe(false)
  })

  it('should be true for JSON data collection with non-alphabetical key order', async () => {
    const jsonContent = JSON.stringify({
      seo_title: 'My Page Title',
      seo_description: 'My page description.',
      seo_schema: '{}',
      description: 'Hello world',
    }, null, 2)

    const document = {
      id: 'landing_page/landing_page.json',
      extension: ContentFileExtension.JSON,
      stem: 'landing_page',
      meta: {},
      description: 'Hello world',
      seo_description: 'My page description.',
      seo_schema: '{}',
      seo_title: 'My Page Title',
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(jsonContent, document)
    expect(result).toBe(true)
  })

  it('should be true when frontmatter fields are stored in meta by @nuxt/content instead of top-level', async () => {
    const markdownContent = `---
title: Test Page
navigation: hidden
sitemap:
  loc: /test
  images: []
  videos: []
---

Hello world
`

    const document = {
      id: 'content:pages/test.md',
      extension: ContentFileExtension.Markdown,
      stem: 'pages/test',
      title: 'Test Page',
      meta: {
        navigation: 'hidden',
        sitemap: { loc: '/test', images: [], videos: [] },
      },
      body: { nodes: [['p', {}, 'Hello world']], frontmatter: {}, meta: {} },
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(markdownContent, document)
    expect(result).toBe(true)
  })

  it('should be true when a bare fence is compared against a stored `language: text` artifact', async () => {
    const markdownContent = '```\nassets/\n  icons/\n    my-logo.svg\n```\n'

    const document = {
      id: 'content:test.md',
      extension: ContentFileExtension.Markdown,
      stem: 'test',
      meta: {},
      body: {
        nodes: [['pre', { language: 'text' }, ['code', { __ignoreMap: '' }, 'assets/\n  icons/\n    my-logo.svg']]],
        frontmatter: {},
        meta: {},
      },
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(markdownContent, document)
    expect(result).toBe(true)
  })

  it('should be true when a bare fence is compared against a legacy MDC document with `language: text`', async () => {
    const markdownContent = '```\nassets/\n  icons/\n    my-logo.svg\n```\n'

    const document = {
      id: 'content:test.md',
      extension: ContentFileExtension.Markdown,
      stem: 'test',
      meta: {},
      body: {
        type: 'root',
        children: [{
          type: 'element',
          tag: 'pre',
          props: { code: 'assets/\n  icons/\n    my-logo.svg\n', language: 'text' },
          children: [],
        }],
      },
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(markdownContent, document)
    expect(result).toBe(true)
  })

  it('should be true when an explicit ```text fence is compared against a stored body with no language', async () => {
    const markdownContent = '```text\nassets/\n```\n'

    const document = {
      id: 'content:test.md',
      extension: ContentFileExtension.Markdown,
      stem: 'test',
      meta: {},
      body: {
        nodes: [['pre', {}, ['code', { __ignoreMap: '' }, 'assets/']]],
        frontmatter: {},
        meta: {},
      },
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(markdownContent, document)
    expect(result).toBe(true)
  })

  it('should be false when the fence language genuinely differs', async () => {
    const markdownContent = '```ts\nconst a = 1\n```\n'

    const document = {
      id: 'content:test.md',
      extension: ContentFileExtension.Markdown,
      stem: 'test',
      meta: {},
      body: {
        nodes: [['pre', { language: 'js' }, ['code', { __ignoreMap: '' }, 'const a = 1']]],
        frontmatter: {},
        meta: {},
      },
    } as unknown as DatabaseItem

    const result = await isDocumentMatchingContent(markdownContent, document)
    expect(result).toBe(false)
  })
})

describe('sanitizeDocumentTree', () => {
  it('removes fields marked hidden in collection schema', () => {
    const collection = {
      name: 'authors',
      schema: {
        definitions: {
          authors: {
            properties: {
              secret: {
                $content: {
                  editor: { hidden: true },
                },
              },
              public: {
                $content: {
                  editor: { hidden: false },
                },
              },
              misc: {},
            },
          },
        },
      },
    } as unknown as CollectionInfo

    const document = {
      id: 'content:authors/atinux.yml',
      extension: 'yml',
      stem: 'authors/atinux',
      meta: {},
      secret: 'should be removed',
      public: 'should stay',
      misc: 'also stays',
    } as unknown as DatabaseItem

    const result = sanitizeDocumentTree({ ...document }, collection)

    expect('secret' in result).toBe(false)
    expect(result.public).toBe('should stay')
    expect(result.misc).toBe('also stays')
  })
})

describe('applyCollectionSchema', () => {
  const pageCollection = {
    type: 'page',
    name: 'docs',
    schema: {
      definitions: {
        docs: {
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            seo: { type: 'object' },
          },
        },
      },
    },
  } as unknown as CollectionInfo

  it('does not mutate a shared seo object on the input document', () => {
    const collection = pageCollection

    // Simulate the aliasing TipTap creates
    const sharedSeo = { description: 'Welcome to Docus theme documentation.' }
    const document = {
      title: 'Introduction',
      description: 'Welcome to Docus theme documentation.',
      seo: sharedSeo,
      body: { frontmatter: { seo: sharedSeo }, nodes: [], meta: {} },
      meta: {},
    } as unknown as DatabaseItem

    applyCollectionSchema('content:introduction.md', collection, document)

    // The input's seo object MUST be unchanged
    expect(sharedSeo).toEqual({ description: 'Welcome to Docus theme documentation.' })
    expect('title' in sharedSeo).toBe(false)
    expect((document.body as { frontmatter: { seo: object } }).frontmatter.seo).toEqual(sharedSeo)
  })
})

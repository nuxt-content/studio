import { describe, it, expect } from 'vitest'
import { getCollectionByFilePath, generateFsPathFromId, getCollectionSource, generateIdFromFsPath } from '../../src/runtime/utils/collection'
import type { CollectionInfo, ResolvedCollectionSource } from '@nuxt/content'
import { collections } from '../mocks/collection'

describe('getCollectionByFilePath', () => {
  it('should return landing collection for index.md', () => {
    const result = getCollectionByFilePath('index.md', collections)

    expect(result).toBeDefined()
    expect(result?.name).toBe('landing')
  })

  it('should return docs collection for any non-index file', () => {
    const result = getCollectionByFilePath('1.getting-started/2.introduction.md', collections)
    expect(result).toBeDefined()
    expect(result?.name).toBe('docs')

    const result2 = getCollectionByFilePath('.navigation.yml', collections)
    expect(result2).toBeDefined()
    expect(result2?.name).toBe('docs')
  })

  it('should return docs collection for nested files', () => {
    const result = getCollectionByFilePath('2.essentials/1.nested/3.components.md', collections)

    expect(result).toBeDefined()
    expect(result?.name).toBe('docs')
  })

  it('should return landing collection for root path "/"', () => {
    const result = getCollectionByFilePath('/', collections)

    expect(result).toBeDefined()
    expect(result?.name).toBe('landing')
  })

  it('should return undefined for files not matching any pattern', () => {
    const emptyCollections: Record<string, CollectionInfo> = {}
    const result = getCollectionByFilePath('test.txt', emptyCollections)

    expect(result).toBeUndefined()
  })
})

describe('generateFsPathFromId', () => {
  it('One file included', () => {
    const id = 'landing/index.md'
    const source = {
      prefix: '/',
      include: 'index.md',
    } as ResolvedCollectionSource
    const result = generateFsPathFromId(id, source)
    expect(result).toBe('index.md')
  })

  it('Global pattern included', () => {
    const id = 'docs/1.getting-started/2.introduction.md'
    const source = {
      prefix: '/',
      include: '**',
      exclude: ['index.md'],
    } as ResolvedCollectionSource
    const result = generateFsPathFromId(id, source)
    expect(result).toBe('1.getting-started/2.introduction.md')
  })

  it('Custom pattern with prefix', () => {
    const id = 'docs_en/en/1.getting-started/2.introduction.md'
    const source = {
      prefix: '/en',
      include: 'en/**/*',
      exclude: [
        'en/index.md',
      ],
    } as ResolvedCollectionSource

    const result = generateFsPathFromId(id, source)
    expect(result).toBe('en/1.getting-started/2.introduction.md')
  })

  it('Custom pattern with root prefix and fixed part', () => {
    const id = 'pages/about.md'
    const source: ResolvedCollectionSource = {
      prefix: '/',
      include: 'pages/**/*',
      cwd: '',
      _resolved: true,
    }

    const result = generateFsPathFromId(id, source)
    expect(result).toBe('pages/about.md')
  })
})

describe('generateIdFromFsPath', () => {
  it('should generate id for single file with no prefix', () => {
    const path = 'index.md'
    const result = generateIdFromFsPath(path, collections.landing!)
    expect(result).toBe('landing/index.md')
  })

  it('should generate id for nested file with global pattern', () => {
    const path = '1.getting-started/2.introduction.md'
    const result = generateIdFromFsPath(path, collections.docs!)
    expect(result).toBe('docs/1.getting-started/2.introduction.md')
  })

  it('should handle deeply nested paths', () => {
    const path = '2.essentials/1.nested/3.components.md'
    const result = generateIdFromFsPath(path, collections.docs!)
    expect(result).toBe('docs/2.essentials/1.nested/3.components.md')
  })

  it('should handle collection with custom prefix', () => {
    const customCollection: CollectionInfo = {
      name: 'docs_en',
      pascalName: 'DocsEn',
      tableName: '_content_docs_en',
      source: [
        {
          _resolved: true,
          prefix: '/en',
          cwd: '',
          include: 'en/**/*',
          exclude: ['en/index.md'],
        },
      ],
      type: 'page',
      fields: {},
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $ref: '#/definitions/docs_en',
        definitions: {},
      },
      tableDefinition: '',
    }

    const path = 'en/1.getting-started/2.introduction.md'
    const result = generateIdFromFsPath(path, customCollection)
    expect(result).toBe('docs_en/en/1.getting-started/2.introduction.md')
  })

  it('should handle empty prefix correctly', () => {
    const customCollection: CollectionInfo = {
      name: 'pages',
      pascalName: 'Pages',
      tableName: '_content_pages',
      source: [
        {
          _resolved: true,
          prefix: '',
          cwd: '',
          include: 'content/**/*.md',
        },
      ],
      type: 'page',
      fields: {},
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $ref: '#/definitions/pages',
        definitions: {},
      },
      tableDefinition: '',
    }

    const path = 'content/about.md'
    const result = generateIdFromFsPath(path, customCollection)
    expect(result).toBe('pages/about.md')
  })
})

describe('getCollectionSource', () => {
  it('should return matching source for root docs collection', () => {
    const id = 'docs/1.getting-started/2.introduction.md'
    const source = getCollectionSource(id, collections.docs!)

    expect(source).toEqual(collections.docs!.source[0])
  })

  it('should return matching source for root index file in landing collection', () => {
    const id = 'landing/index.md'
    const source = getCollectionSource(id, collections.landing!)

    expect(source).toEqual(collections.landing!.source[0])
  })

  it('should handle root dot files correctly', () => {
    const id = 'docs/.navigation.yml'
    const source = getCollectionSource(id, collections.docs!)

    expect(source).toEqual(collections.docs!.source[0])
  })

  it('should return undefined when path matches exclude pattern', () => {
    const id = 'landing/index.md'
    const source = getCollectionSource(id, collections.docs!)

    expect(source).toBeUndefined()
  })

  it('should return correct source when collection has prefix with dynamic include pattern', () => {
    const collectionWithPrefix: CollectionInfo = {
      name: 'blog',
      pascalName: 'Blog',
      tableName: '_content_blog',
      source: [
        {
          _resolved: true,
          prefix: '/blog',
          include: 'blog/**/*.md',
          cwd: '',
        },
      ],
      type: 'page',
      fields: {},
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $ref: '#/definitions/blog',
        definitions: {},
      },
      tableDefinition: '',
    }

    const id = 'blog/blog/my-post.md'
    const source = getCollectionSource(id, collectionWithPrefix)
    expect(source).toEqual(collectionWithPrefix.source[0])
  })

  it('should return correct source when collection has multiple sources', () => {
    const multiSourceCollection: CollectionInfo = {
      name: 'content',
      pascalName: 'Content',
      tableName: '_content',
      source: [
        {
          _resolved: true,
          prefix: '/blog',
          cwd: '',
          include: 'blog/**/*.md',
        },
        {
          _resolved: true,
          prefix: '/docs',
          cwd: '',
          include: 'docs/**/*.md',
        },
      ],
      type: 'page',
      fields: {},
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $ref: '#/definitions/content',
        definitions: {},
      },
      tableDefinition: '',
    }

    const blogId = 'content/blog/my-post.md'
    const blogResult = getCollectionSource(blogId, multiSourceCollection)
    expect(blogResult).toEqual(multiSourceCollection.source[0])

    const docsId = 'content/docs/guide.md'
    const docsResult = getCollectionSource(docsId, multiSourceCollection)
    expect(docsResult).toEqual(multiSourceCollection.source[1])
  })

  it('should return correct source when collection has root prefix with custom dynamic include pattern', () => {
    const rootPrefixCollection: CollectionInfo = {
      name: 'pages',
      pascalName: 'Pages',
      tableName: '_content_pages',
      source: [
        {
          _resolved: true,
          prefix: '/',
          include: 'pages/**/*.md',
          cwd: '',
        },
      ],
      type: 'page',
      fields: {},
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $ref: '#/definitions/__SCHEMA__',
        definitions: { },
      },
      tableDefinition: '',
    }

    // {collection.name}/{source.prefix}/{name}
    const id = 'pages/about.md'
    const source = getCollectionSource(id, rootPrefixCollection)
    expect(source).toEqual(rootPrefixCollection.source[0])
  })

  it('should return correct source when collection has custom prefix with custom dynamic include pattern', () => {
    const customPrefixCollection: CollectionInfo = {
      name: 'edge_case',
      pascalName: 'EdgeCase',
      tableName: '_content_edge_case',
      source: [
        {
          _resolved: true,
          prefix: '/prefix',
          include: 'path/**/*.md',
          cwd: '',
        },
      ],
      type: 'page',
      fields: {},
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $ref: '#/definitions/edge_case',
        definitions: {},
      },
      tableDefinition: '',
    }

    const id = 'edge_case/prefix/file.md'
    const source = getCollectionSource(id, customPrefixCollection)
    expect(source).toEqual(customPrefixCollection.source[0])
  })
})

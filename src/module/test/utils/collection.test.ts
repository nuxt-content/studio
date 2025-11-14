import { describe, it, expect } from 'vitest'
import { getCollectionByFilePath, generateIdFromFsPath, generateFsPathFromId } from '../../src/runtime/utils/collection'
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

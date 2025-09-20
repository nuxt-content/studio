import { describe, it, expect } from 'vitest'
import { getCollectionByFilePath, generateIdFromFsPath } from '../../src/runtime/utils/collections'
import type { CollectionInfo, ResolvedCollectionSource } from '@nuxt/content'
import { collections } from '../mocks/collections'

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

describe('generateIdFromFsPath', () => {
  it('should generate ID using collection name and prefix from landing collection', () => {
    const result = generateIdFromFsPath('index.md', collections.landing!)
    expect(result).toBe('landing/index.md')
  })

  it('should generate ID using collection name and prefix from docs collection', () => {
    const result = generateIdFromFsPath('1.getting-started/2.introduction.md', collections.docs!)
    expect(result).toBe('docs/1.getting-started/2.introduction.md')
  })

  it('should handle collection with empty prefix', () => {
    const mockCollection: CollectionInfo = {
      ...collections.docs as CollectionInfo,
      name: 'test',
      source: [{
        ...collections.docs!.source[0] as ResolvedCollectionSource,
        prefix: '',
      }],
    }
    const result = generateIdFromFsPath('content/test.md', mockCollection)
    expect(result).toBe('test/content/test.md')
  })

  // TODO handle multiple sources
  // it('should use the appropriate source when collection has multiple sources', () => {
  //   const mockCollection: CollectionInfo = {
  //     ...collections.docs,
  //     name: 'multi-source',
  //     source: [
  //       {
  //         ...collections.docs.source[0],
  //         prefix: '/first',
  //       },
  //       {
  //         ...collections.docs.source[0],
  //         prefix: '/second',
  //       },
  //     ],
  //   }
  //   const result = generateIdFromFsPath(mockCollection, 'content/test.md')
  //   expect(result).toBe('multi-source/first/content/test.md')
  // })
})

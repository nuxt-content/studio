import { describe, it, expect } from 'vitest'
import { getCollectionSourceById } from '../../src/runtime/utils/source'
import { collections } from '../mocks/collection'
import type { ResolvedCollectionSource } from '@nuxt/content'

describe('getCollectionSourceById', () => {
  it('should return matching source for root docs collection', () => {
    const id = 'collectionName/1.getting-started/2.introduction.md'
    const source = getCollectionSourceById(id, collections.docs!.source)

    expect(source).toEqual(collections.docs!.source[0])
  })

  it('should return matching source for root index file in landing collection', () => {
    const id = 'collectionName/index.md'
    const source = getCollectionSourceById(id, collections.landing!.source)

    expect(source).toEqual(collections.landing!.source[0])
  })

  it('should handle root dot files correctly', () => {
    const id = 'collectionName/.navigation.yml'
    const source = getCollectionSourceById(id, collections.docs!.source)

    expect(source).toEqual(collections.docs!.source[0])
  })

  it('should return undefined when path matches exclude pattern', () => {
    const id = 'collectionName/index.md'
    const source = getCollectionSourceById(id, collections.docs!.source)

    expect(source).toBeUndefined()
  })

  it('should return correct source when source has prefix with dynamic include pattern', () => {
    const sourceWithPrefix: ResolvedCollectionSource[] = [
      {
        _resolved: true,
        prefix: '/blog',
        include: 'blog/**/*.md',
        cwd: '',
      },
    ]

    const id = 'collectionName/blog/my-post.md'
    const source = getCollectionSourceById(id, sourceWithPrefix)
    expect(source).toEqual(sourceWithPrefix[0])
  })

  it('should return correct source when source has multiple sources', () => {
    const multipleSources: ResolvedCollectionSource[] = [
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
    ]

    const blogId = 'collectionName/blog/my-post.md'
    const blogResult = getCollectionSourceById(blogId, multipleSources)
    expect(blogResult).toEqual(multipleSources[0])

    const docsId = 'collectionName/docs/guide.md'
    const docsResult = getCollectionSourceById(docsId, multipleSources)
    expect(docsResult).toEqual(multipleSources[1])
  })

  it('should return correct source when source has root prefix with custom dynamic include pattern', () => {
    const rootPrefixSource: ResolvedCollectionSource[] = [
      {
        _resolved: true,
        prefix: '/',
        include: 'pages/**/*.md',
        cwd: '',
      },
    ]

    // {collection.name}/{source.prefix}/{name}
    const id = 'collectionName/about.md'
    const source = getCollectionSourceById(id, rootPrefixSource)
    expect(source).toEqual(rootPrefixSource[0])
  })

  it('should return correct source when source has custom prefix with custom dynamic include pattern', () => {
    const customPrefixSource: ResolvedCollectionSource[] = [
      {
        _resolved: true,
        prefix: '/prefix',
        include: 'path/**/*.md',
        cwd: '',
      },
    ]

    const id = 'collectionName/prefix/file.md'
    const source = getCollectionSourceById(id, customPrefixSource)
    expect(source).toEqual(customPrefixSource[0])
  })
})

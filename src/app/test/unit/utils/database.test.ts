import { describe, it, expect } from 'vitest'
import { isEqual } from '../../../src/utils/database'
import type { DatabasePageItem } from '../../../src/types'
import { ContentFileExtension } from '../../../src/types'

describe('isEqual', () => {
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

    expect(isEqual(document1, document2)).toBe(true)
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

    expect(isEqual(document1, document2)).toBe(false)
  })

  it('should return true for two identical yaml document with different order of keys', () => {
    const document1: DatabasePageItem = {
      extension: ContentFileExtension.YAML,
      description: 'A test document',
      title: 'Test Document',
      path: '/index',
      id: 'content:index.yml',
      tags: ['tag1', 'tag2'],
    }

    const document2: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extension: ContentFileExtension.YAML,
      tags: ['tag1', 'tag2'],
    }

    expect(isEqual(document1, document2)).toBe(true)
  })

  it('should return true if one document has extra key with null/undefined value', () => {
    const document1: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
    }
    const document2: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
      extra: null,
    }
    expect(isEqual(document1, document2)).toBe(true)
  })

  it('should ignore null/undefiend values', () => {
    const document1: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: null,
    }

    const document2: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: undefined,
    }

    expect(isEqual(document1, document2)).toBe(true)
  })

  it('should return false if one of documents missing a key', () => {
    const document1: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      description: 'A test document',
    }
    const document2: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
    }

    expect(isEqual(document1, document2)).toBe(false)
  })

  it('should return false if array values are different', () => {
    const document1: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      title: 'Test Document',
      tags: ['tag1', 'tag2'],
    }
    const document2: DatabasePageItem = {
      id: 'content:index.yml',
      path: '/index',
      tags: ['tag1', 'tag3'],
      title: 'Test Document',
    }

    expect(isEqual(document1, document2)).toBe(false)
  })
})

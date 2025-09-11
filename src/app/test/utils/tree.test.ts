import { describe, it, expect } from 'vitest'
import { buildTree, findParentFromId } from '../../src/utils/tree'
import { tree } from '../mocks/tree'
import type { TreeItem } from '../../src/types/tree'
import { dbItemsList } from '../mocks/database'

describe('buildTree', () => {
  it('should build a tree from a list of items without exisiting draft', () => {
    const tree = buildTree(dbItemsList, [])
    const result: TreeItem[] = [
      {
        id: 'landing/index.md',
        name: 'home',
        path: '/',
        type: 'file',
      },
      {
        id: 'docs/1.getting-started',
        name: 'getting-started',
        path: '/getting-started',
        type: 'directory',
        children: [
          {
            id: 'docs/1.getting-started/2.introduction.md',
            name: 'introduction',
            path: '/getting-started/introduction',
            type: 'file',
            fileType: 'page',
          },
          {
            id: 'docs/1.getting-started/3.installation.md',
            name: 'installation',
            path: '/getting-started/installation',
            type: 'file',
            fileType: 'page',
          },
        ],
      },
    ]
    expect(tree).toMatchObject(result)
  })
})

describe('findParentFromId', () => {
  it('should find direct parent of a child', () => {
    const parent = findParentFromId(tree, 'docs/1.getting-started/2.introduction.md')
    expect(parent).toBeDefined()
    expect(parent?.id).toBe('docs/1.getting-started')
  })

  it('should find nested parent', () => {
    const parent = findParentFromId(tree, 'docs/1.getting-started/1.advanced/1.studio.md')
    expect(parent).toBeDefined()
    expect(parent?.id).toBe('docs/1.getting-started/1.advanced')
  })

  it('should return null for root level items', () => {
    const parent = findParentFromId(tree, 'landing/index.md')
    expect(parent).toBeNull()
  })

  it('should return null for non-existent items', () => {
    const parent = findParentFromId(tree, 'non/existent/item.md')
    expect(parent).toBeNull()
  })

  it('should return null for empty tree', () => {
    const parent = findParentFromId([], 'any/item.md')
    expect(parent).toBeNull()
  })
})

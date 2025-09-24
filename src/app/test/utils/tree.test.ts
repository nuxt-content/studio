import { describe, it, expect } from 'vitest'
import { buildTree, findParentFromId, findItemFromRoute, findItemFromId } from '../../src/utils/tree'
import { tree } from '../mocks/tree'
import type { TreeItem } from '../../src/types/tree'
import { dbItemsList } from '../mocks/database'
import type { DraftItem } from '../../src/types/draft'
import { DraftStatus } from '../../src/types/draft'
import type { RouteLocationNormalized } from 'vue-router'

describe('buildTree', () => {
  // Result based on dbItemsList mock
  const result: TreeItem[] = [
    {
      id: 'landing/index.md',
      name: 'home',
      fsPath: 'index.md',
      type: 'file',
      routePath: '/',
    },
    {
      id: 'docs/1.getting-started',
      name: 'getting-started',
      fsPath: '1.getting-started',
      routePath: '/getting-started',
      type: 'directory',
      children: [
        {
          id: 'docs/1.getting-started/2.introduction.md',
          name: 'introduction',
          fsPath: '1.getting-started/2.introduction.md',
          type: 'file',
          routePath: '/getting-started/introduction',
        },
        {
          id: 'docs/1.getting-started/3.installation.md',
          name: 'installation',
          fsPath: '1.getting-started/3.installation.md',
          type: 'file',
          routePath: '/getting-started/installation',
        },
      ],
    },
  ]

  it('should build a tree from a list of database items with empty draft', () => {
    const tree = buildTree(dbItemsList, null)
    expect(tree).toStrictEqual(result)
  })

  it('should build a tree from a list of database items and set file status for root file based on draft', () => {
    const draftList: DraftItem[] = [{
      id: dbItemsList[0].id,
      fsPath: 'index.md',
      status: DraftStatus.Created,
    }]
    const tree = buildTree(dbItemsList, draftList)

    // add status to first element of result
    const expectedTree: TreeItem[] = [{ ...result[0], status: DraftStatus.Created }, ...result.slice(1)]

    expect(tree).toStrictEqual(expectedTree)
  })

  it('should build a tree from a list of database items and set file status for nestedfile and parent directory based on draft', () => {
    const draftList: DraftItem[] = [{
      id: dbItemsList[1].id,
      fsPath: '1.getting-started/2.introduction.md',
      status: DraftStatus.Updated,
    }]
    const tree = buildTree(dbItemsList, draftList)

    const expectedTree: TreeItem[] = [
      result[0],
      {
        ...result[1],
        status: DraftStatus.Updated,
        children: [
          { ...result[1].children![0], status: DraftStatus.Updated },
          ...result[1].children!.slice(1),
        ],
      },
    ]

    expect(tree).toStrictEqual(expectedTree)
  })

  it('should build a tree from a list of database items and set file status for nestedfile and parent directory based on draft (status is always updated in directory)', () => {
    const draftList: DraftItem[] = [{
      id: dbItemsList[1].id,
      fsPath: '1.getting-started/2.introduction.md',
      status: DraftStatus.Created,
    }]
    const tree = buildTree(dbItemsList, draftList)

    const expectedTree: TreeItem[] = [
      result[0],
      {
        ...result[1],
        status: DraftStatus.Updated,
        children: [
          { ...result[1].children![0], status: DraftStatus.Created },
          ...result[1].children!.slice(1),
        ],
      },
    ]

    expect(tree).toStrictEqual(expectedTree)
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

describe('findItemFromRoute', () => {
  const mockRoute = (path: string) => ({ path }) as RouteLocationNormalized

  it('should find root level file by path', () => {
    const route = mockRoute('/')
    const item = findItemFromRoute(tree, route)
    expect(item).toBeDefined()
    expect(item?.id).toBe('landing/index.md')
    expect(item?.name).toBe('home')
  })

  it('should find nested file by path', () => {
    const route = mockRoute('/getting-started/introduction')
    const item = findItemFromRoute(tree, route)
    expect(item).toBeDefined()
    expect(item?.id).toBe('docs/1.getting-started/2.introduction.md')
    expect(item?.name).toBe('introduction')
  })

  it('should find deeply nested file by path', () => {
    const route = mockRoute('/getting-started/installation/advanced/studio')
    const item = findItemFromRoute(tree, route)
    expect(item).toBeDefined()
    expect(item?.id).toBe('docs/1.getting-started/1.advanced/1.studio.md')
    expect(item?.name).toBe('studio')
  })

  it('should return null for non-existent route', () => {
    const route = mockRoute('/non/existent/path')
    const item = findItemFromRoute(tree, route)
    expect(item).toBeNull()
  })

  it('should return null for empty tree', () => {
    const route = mockRoute('/')
    const item = findItemFromRoute([], route)
    expect(item).toBeNull()
  })
})

describe('findItemFromId', () => {
  it('should find root level item by id', () => {
    const item = findItemFromId(tree, 'landing/index.md')
    expect(item).toBeDefined()
    expect(item?.id).toBe('landing/index.md')
    expect(item?.name).toBe('home')
    expect(item?.type).toBe('file')
  })

  it('should find nested file by id', () => {
    const item = findItemFromId(tree, 'docs/1.getting-started/2.introduction.md')
    expect(item).toBeDefined()
    expect(item?.id).toBe('docs/1.getting-started/2.introduction.md')
    expect(item?.name).toBe('introduction')
    expect(item?.type).toBe('file')
  })

  it('should find directory by id', () => {
    const item = findItemFromId(tree, 'docs/1.getting-started')
    expect(item).toBeDefined()
    expect(item?.id).toBe('docs/1.getting-started')
    expect(item?.name).toBe('getting-started')
    expect(item?.type).toBe('directory')
    expect(item?.children).toBeDefined()
  })

  it('should find deeply nested item by id', () => {
    const item = findItemFromId(tree, 'docs/1.getting-started/1.advanced/1.studio.md')
    expect(item).toBeDefined()
    expect(item?.id).toBe('docs/1.getting-started/1.advanced/1.studio.md')
    expect(item?.name).toBe('studio')
    expect(item?.type).toBe('file')
  })

  it('should find nested directory by id', () => {
    const item = findItemFromId(tree, 'docs/1.getting-started/1.advanced')
    expect(item).toBeDefined()
    expect(item?.id).toBe('docs/1.getting-started/1.advanced')
    expect(item?.name).toBe('advanced')
    expect(item?.type).toBe('directory')
  })

  it('should return null for non-existent id', () => {
    const item = findItemFromId(tree, 'non/existent/item.md')
    expect(item).toBeNull()
  })

  it('should return null for partial id match', () => {
    const item = findItemFromId(tree, 'docs/1.getting-started/2.introduction')
    expect(item).toBeNull()
  })

  it('should return null for empty tree', () => {
    const item = findItemFromId([], 'any/item.md')
    expect(item).toBeNull()
  })

  it('should return null for empty id', () => {
    const item = findItemFromId(tree, '')
    expect(item).toBeNull()
  })
})

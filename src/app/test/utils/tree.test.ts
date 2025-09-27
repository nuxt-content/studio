import { describe, it, expect } from 'vitest'
import { buildTree, findParentFromId, findItemFromRoute, findItemFromId, findDescendantsFileItemsFromId } from '../../src/utils/tree'
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

  it('Db items list without draft', () => {
    const tree = buildTree(dbItemsList, null)
    expect(tree).toStrictEqual(result)
  })

  it('Db items list with draft', () => {
    const draftList: DraftItem[] = [{
      id: dbItemsList[0].id,
      fsPath: 'index.md',
      status: DraftStatus.Created,
    }]
    const tree = buildTree(dbItemsList, draftList)

    expect(tree).toStrictEqual([
      {
        ...result[0],
        status: DraftStatus.Created,
      },
      ...result.slice(1)])
  })

  it('Db items list with DELETED file in exsiting directory in draft (directory status is set)', () => {
    const draftList: DraftItem[] = [{
      id: 'docs/1.getting-started/2.deleted.md',
      fsPath: '1.getting-started/2.deleted.md',
      status: DraftStatus.Deleted,
    }]

    const tree = buildTree(dbItemsList, draftList)

    expect(tree).toStrictEqual([
      { ...result[0] },
      {
        ...result[1],
        status: DraftStatus.Updated,
        children: [
          ...result[1].children!,
          {
            id: 'docs/1.getting-started/2.deleted.md',
            name: 'deleted',
            fsPath: '1.getting-started/2.deleted.md',
            type: 'file',
            routePath: '/getting-started/deleted',
            status: DraftStatus.Deleted,
          },
        ],
      },
    ])
  })

  it('Db items list with DELETED file in non existing directory in draft', () => {
    const draftList: DraftItem[] = [{
      id: 'docs/1.deleted-directory/2.deleted-file.md',
      fsPath: '1.deleted-directory/2.deleted-file.md',
      status: DraftStatus.Deleted,
    }]

    const tree = buildTree(dbItemsList, draftList)

    expect(tree).toStrictEqual([
      ...result,
      {
        id: 'docs/1.deleted-directory',
        name: 'deleted-directory',
        fsPath: '1.deleted-directory',
        type: 'directory',
        status: DraftStatus.Updated,
        children: [
          {
            id: 'docs/1.deleted-directory/2.deleted-file.md',
            name: 'deleted-file',
            fsPath: '1.deleted-directory/2.deleted-file.md',
            type: 'file',
            status: DraftStatus.Deleted,
          },
        ],
      },
    ])
  })

  it('Db items list with all DELETED files in existing directory in draft (directory status is set to DELETED)', () => {
    const draftList: DraftItem[] = [{
      id: dbItemsList[1].id,
      fsPath: '1.getting-started/2.introduction.md',
      status: DraftStatus.Deleted,
    }, {
      id: dbItemsList[2].id,
      fsPath: '1.getting-started/3.installation.md',
      status: DraftStatus.Deleted,
    }]

    const tree = buildTree(dbItemsList, draftList)

    console.log('Tree', tree)

    expect(tree).toStrictEqual([
      result[0],
      {
        ...result[1],
        status: DraftStatus.Deleted,
        children: [
          {
            ...result[1].children![0],
            status: DraftStatus.Deleted,
          },
          {
            ...result[1].children![1],
            status: DraftStatus.Deleted,
          },
        ],
      },
    ])
  })

  it('Db items list with UPDATED file in exsiting directory in draft (directory status is set)', () => {
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
          {
            ...result[1].children![0],
            status: DraftStatus.Updated,
          },
          ...result[1].children!.slice(1),
        ],
      },
    ]

    expect(tree).toStrictEqual(expectedTree)
  })

  it('Db items list with UPDATED and OPENED files in exsiting directory in draft (directory status is set)', () => {
    const draftList: DraftItem[] = [{
      id: dbItemsList[1].id,
      fsPath: '1.getting-started/2.introduction.md',
      status: DraftStatus.Created,
    }, {
      id: dbItemsList[2].id,
      fsPath: '1.getting-started/3.installation.md',
      status: DraftStatus.Opened,
    }]

    const tree = buildTree(dbItemsList, draftList)

    const expectedTree: TreeItem[] = [
      result[0],
      {
        ...result[1],
        status: DraftStatus.Updated,
        children: [
          { ...result[1].children![0], status: DraftStatus.Created },
          { ...result[1].children![1], status: DraftStatus.Opened },
          ...result[1].children!.slice(2),
        ],
      },
    ]

    expect(tree).toStrictEqual(expectedTree)
  })

  it('Db items list with OPENED files in exsiting directory in draft (directory status is not set)', () => {
    const draftList: DraftItem[] = [{
      id: dbItemsList[1].id,
      fsPath: '1.getting-started/2.introduction.md',
      status: DraftStatus.Opened,
    }, {
      id: dbItemsList[2].id,
      fsPath: '1.getting-started/3.installation.md',
      status: DraftStatus.Opened,
    }]

    const tree = buildTree(dbItemsList, draftList)

    const expectedTree: TreeItem[] = [
      result[0],
      {
        ...result[1],
        children: [
          {
            ...result[1].children![0], status: DraftStatus.Opened },
          { ...result[1].children![1], status: DraftStatus.Opened },
          ...result[1].children!.slice(2),
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

describe('findDescendantsFileItemsFromId', () => {
  it('returns exact match for a root level file', () => {
    const descendants = findDescendantsFileItemsFromId(tree, 'landing/index.md')
    expect(descendants).toHaveLength(1)
    expect(descendants[0].id).toBe('landing/index.md')
  })

  it('returns empty array for non-existent id', () => {
    const descendants = findDescendantsFileItemsFromId(tree, 'non-existent/file.md')
    expect(descendants).toHaveLength(0)
  })

  it('returns all descendants files for directory id', () => {
    const descendants = findDescendantsFileItemsFromId(tree, 'docs/1.getting-started')

    expect(descendants).toHaveLength(3)

    expect(descendants.some(item => item.id === 'docs/1.getting-started/2.introduction.md')).toBe(true)
    expect(descendants.some(item => item.id === 'docs/1.getting-started/3.installation.md')).toBe(true)
    expect(descendants.some(item => item.id === 'docs/1.getting-started/1.advanced/1.studio.md')).toBe(true)
  })

  it('returns all descendants files for nested directory id', () => {
    const descendants = findDescendantsFileItemsFromId(tree, 'docs/1.getting-started/1.advanced')

    expect(descendants).toHaveLength(1)

    expect(descendants.some(item => item.id === 'docs/1.getting-started/1.advanced/1.studio.md')).toBe(true)
  })

  it('returns only the file itself when searching for a specific file', () => {
    const descendants = findDescendantsFileItemsFromId(tree, 'docs/1.getting-started/2.introduction.md')

    expect(descendants).toHaveLength(1)
    expect(descendants[0].id).toBe('docs/1.getting-started/2.introduction.md')
  })

  it('returns deeply nested file when searching by specific file id', () => {
    const descendants = findDescendantsFileItemsFromId(tree, 'docs/1.getting-started/1.advanced/1.studio.md')

    expect(descendants).toHaveLength(1)
    expect(descendants[0].id).toBe('docs/1.getting-started/1.advanced/1.studio.md')
  })
})

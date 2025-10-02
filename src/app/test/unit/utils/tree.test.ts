import { describe, it, expect } from 'vitest'
import { buildTree, findParentFromId, findItemFromRoute, findItemFromId, findDescendantsFileItemsFromId, getTreeStatus } from '../../../src/utils/tree'
import { tree } from '../../../test/mocks/tree'
import type { TreeItem } from '../../../src/types/tree'
import { dbItemsList, nestedDbItemsList } from '../../../test/mocks/database'
import type { DraftItem } from '../../../src/types/draft'
import { DraftStatus, TreeStatus } from '../../../src/types'
import type { RouteLocationNormalized } from 'vue-router'
import type { DatabaseItem } from '../../../src/types/database'

describe('buildTree with one level of depth', () => {
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

  it('Without draft', () => {
    const tree = buildTree(dbItemsList, null)
    expect(tree).toStrictEqual(result)
  })

  it('With draft', () => {
    const createdDbItem: DatabaseItem & { fsPath: string } = dbItemsList[0]

    const draftList: DraftItem[] = [{
      id: createdDbItem.id,
      fsPath: createdDbItem.fsPath,
      status: DraftStatus.Created,
      original: undefined,
      modified: createdDbItem,
    }]

    const tree = buildTree(dbItemsList, draftList)

    expect(tree).toStrictEqual([
      {
        ...result[0],
        status: TreeStatus.Created,
      },
      ...result.slice(1)])
  })

  it('With DELETED draft file in existing directory', () => {
    const deletedDbItem: DatabaseItem & { fsPath: string } = dbItemsList[1] // 2.introduction.md

    const draftList: DraftItem[] = [{
      id: deletedDbItem.id,
      fsPath: deletedDbItem.fsPath,
      status: DraftStatus.Deleted,
      modified: undefined,
      original: deletedDbItem,
    }]

    const dbItemsListWithoutDeletedDbItem = dbItemsList.filter(item => item.id !== deletedDbItem.id)

    const tree = buildTree(dbItemsListWithoutDeletedDbItem, draftList)

    expect(tree).toStrictEqual([
      { ...result[0] },
      {
        ...result[1],
        status: TreeStatus.Updated,
        children: [
          result[1].children![1],
          {
            id: deletedDbItem.id,
            name: 'introduction',
            fsPath: deletedDbItem.fsPath,
            type: 'file',
            routePath: deletedDbItem.path,
            status: TreeStatus.Deleted,
          },
        ],
      },
    ])
  })

  it('With DELETED draft file in non existing directory', () => {
    const deletedDbItem: DatabaseItem & { fsPath: string } = dbItemsList[2] // 3.installation.md

    const draftList: DraftItem[] = [{
      id: deletedDbItem.id,
      fsPath: deletedDbItem.fsPath,
      status: DraftStatus.Deleted,
      modified: undefined,
      original: deletedDbItem,
    }]

    const dbItemsListWithoutDeletedDbItem = dbItemsList.filter(item => item.id !== deletedDbItem.id)

    const tree = buildTree(dbItemsListWithoutDeletedDbItem, draftList)

    expect(tree).toStrictEqual([
      result[0],
      {
        ...result[1],
        status: TreeStatus.Updated,
        children: [
          result[1].children![0],
          {
            id: deletedDbItem.id,
            name: 'installation',
            fsPath: deletedDbItem.fsPath,
            type: 'file',
            routePath: deletedDbItem.path,
            status: TreeStatus.Deleted,
          },
        ],
      },
    ])
  })

  it('With UPDATED draft file in existing directory (directory status is set)', () => {
    const updatedDbItem: DatabaseItem & { fsPath: string } = dbItemsList[1] // 2.introduction.md

    const draftList: DraftItem[] = [{
      id: updatedDbItem.id,
      fsPath: updatedDbItem.fsPath,
      status: DraftStatus.Updated,
      original: updatedDbItem,
      modified: {
        ...updatedDbItem,
        body: {
          type: 'minimark',
          value: ['Modified'],
        },
      },
    }]

    const tree = buildTree(dbItemsList, draftList)

    const expectedTree: TreeItem[] = [
      result[0],
      {
        ...result[1],
        status: TreeStatus.Updated,
        children: [
          {
            ...result[1].children![0],
            status: TreeStatus.Updated,
          },
          ...result[1].children!.slice(1),
        ],
      },
    ]

    expect(tree).toStrictEqual(expectedTree)
  })

  it('With CREATED and OPENED draft files in exsiting directory (directory status is set)', () => {
    const createdDbItem: DatabaseItem & { fsPath: string } = dbItemsList[1] // 2.introduction.md
    const openedDbItem: DatabaseItem & { fsPath: string } = dbItemsList[2] // 3.installation.md

    const draftList: DraftItem[] = [{
      id: createdDbItem.id,
      fsPath: createdDbItem.fsPath,
      status: DraftStatus.Created,
      original: undefined,
      modified: createdDbItem,
    }, {
      id: openedDbItem.id,
      fsPath: openedDbItem.fsPath,
      status: DraftStatus.Pristine,
      original: openedDbItem,
      modified: openedDbItem,
    }]

    const tree = buildTree(dbItemsList, draftList)

    const expectedTree: TreeItem[] = [
      result[0],
      {
        ...result[1],
        status: TreeStatus.Updated,
        children: [
          { ...result[1].children![0], status: TreeStatus.Created },
          { ...result[1].children![1], status: TreeStatus.Opened },
        ],
      },
    ]

    expect(tree).toStrictEqual(expectedTree)
  })

  it('With OPENED draft files in existing directory (directory status is not set)', () => {
    const openedDbItem1: DatabaseItem & { fsPath: string } = dbItemsList[1] // 2.introduction.md
    const openedDbItem2: DatabaseItem & { fsPath: string } = dbItemsList[2] // 3.installation.md

    const draftList: DraftItem[] = [{
      id: openedDbItem1.id,
      fsPath: openedDbItem1.fsPath,
      status: DraftStatus.Pristine,
      original: openedDbItem1,
      modified: openedDbItem1,
    }, {
      id: openedDbItem2.id,
      fsPath: openedDbItem2.fsPath,
      status: DraftStatus.Pristine,
      original: openedDbItem2,
      modified: openedDbItem2,
    }]

    const tree = buildTree(dbItemsList, draftList)

    const expectedTree: TreeItem[] = [
      result[0],
      {
        ...result[1],
        children: [
          {
            ...result[1].children![0], status: TreeStatus.Opened },
          { ...result[1].children![1], status: TreeStatus.Opened },
          ...result[1].children!.slice(2),
        ],
      },
    ]

    expect(tree).toStrictEqual(expectedTree)
  })

  it('With same id DELETED and CREATED draft file resulting in RENAMED', () => {
    const deletedDbItem: DatabaseItem & { fsPath: string } = dbItemsList[1] // 2.introduction.md
    const createdDbItem: DatabaseItem & { fsPath: string } = dbItemsList[2] // 3.installation.md

    const draftList: DraftItem[] = [{
      id: deletedDbItem.id,
      fsPath: deletedDbItem.fsPath,
      status: DraftStatus.Deleted,
      modified: undefined,
      original: deletedDbItem,
    }, {
      id: createdDbItem.id,
      fsPath: createdDbItem.fsPath,
      status: DraftStatus.Created,
      modified: createdDbItem,
      original: deletedDbItem,
    }]

    const dbItemsListWithoutDeletedDbItem = dbItemsList.filter(item => item.id !== deletedDbItem.id)

    const tree = buildTree(dbItemsListWithoutDeletedDbItem, draftList)

    expect(tree).toStrictEqual([
      result[0],
      {
        ...result[1],
        status: TreeStatus.Updated,
        children: [
          {
            id: createdDbItem.id,
            fsPath: createdDbItem.fsPath,
            routePath: '/getting-started/installation',
            name: 'installation',
            type: 'file',
            status: TreeStatus.Renamed,
          },
        ],
      },
    ])
  })
})

describe('buildTree with two levels of depth', () => {
  const result: TreeItem[] = [
    {
      id: 'docs/1.essentials',
      name: 'essentials',
      fsPath: '1.essentials',
      routePath: '/essentials',
      type: 'directory',
      children: [
        {
          id: 'docs/1.essentials/2.configuration.md',
          name: 'configuration',
          fsPath: '1.essentials/2.configuration.md',
          type: 'file',
          routePath: '/essentials/configuration',
        },
        {
          id: 'docs/1.essentials/1.nested',
          name: 'nested',
          fsPath: '1.essentials/1.nested',
          routePath: '/essentials/nested',
          type: 'directory',
          children: [
            {
              id: 'docs/1.essentials/1.nested/2.advanced.md',
              name: 'advanced',
              fsPath: '1.essentials/1.nested/2.advanced.md',
              type: 'file',
              routePath: '/essentials/nested/advanced',
            },
          ],
        },
      ],
    },
  ]

  it('Without draft', () => {
    const tree = buildTree(nestedDbItemsList, null)
    expect(tree).toStrictEqual(result)
  })

  it('With one level of depth draft files', () => {
    const updatedDbItem: DatabaseItem & { fsPath: string } = nestedDbItemsList[0] // 1.essentials/2.configuration.md

    const draftList: DraftItem[] = [{
      id: updatedDbItem.id,
      fsPath: updatedDbItem.fsPath,
      status: DraftStatus.Updated,
      original: updatedDbItem,
      modified: {
        ...updatedDbItem,
        body: {
          type: 'minimark',
          value: ['Modified'],
        },
      },
    }]

    const tree = buildTree(nestedDbItemsList, draftList)

    expect(tree).toStrictEqual([{
      ...result[0],
      status: TreeStatus.Updated,
      children: [
        { ...result[0].children![0], status: TreeStatus.Updated },
        result[0].children![1],
      ],
    }])
  })

  it('With nested levels of depth draft files', () => {
    const updatedDbItem: DatabaseItem & { fsPath: string } = nestedDbItemsList[1] // 1.essentials/1.nested/2.advanced.md

    const draftList: DraftItem[] = [{
      id: updatedDbItem.id,
      fsPath: updatedDbItem.fsPath,
      status: DraftStatus.Updated,
      original: updatedDbItem,
      modified: {
        ...updatedDbItem,
        body: {
          type: 'minimark',
          value: ['Modified'],
        },
      },
    }]

    const tree = buildTree(nestedDbItemsList, draftList)

    expect(tree).toStrictEqual([{
      ...result[0],
      status: TreeStatus.Updated,
      children: [
        result[0].children![0],
        {
          ...result[0].children![1],
          status: TreeStatus.Updated,
          children: [
            {
              ...result[0].children![1].children![0],
              status: TreeStatus.Updated,
            },
          ],
        },
      ],
    }])
  })

  it ('With DELETED draft file in nested non existing directory (directory status is set)', () => {
    const deletedDbItem: DatabaseItem & { fsPath: string } = nestedDbItemsList[1] // 1.essentials/1.nested/2.advanced.md

    const draftList: DraftItem[] = [{
      id: deletedDbItem.id,
      fsPath: deletedDbItem.fsPath,
      status: DraftStatus.Deleted,
      modified: undefined,
      original: deletedDbItem,
    }]

    // Remove the deleted item from the nestedDbItemsList
    const nestedDbItemsListWithoutDeletedDbItem = nestedDbItemsList.filter(item => item.id !== deletedDbItem.id)

    const tree = buildTree(nestedDbItemsListWithoutDeletedDbItem, draftList)

    expect(tree).toStrictEqual([{
      ...result[0],
      status: TreeStatus.Updated,
      children: [
        result[0].children![0],
        {
          ...result[0].children![1],
          status: TreeStatus.Deleted,
          children: [
            {
              id: deletedDbItem.id,
              name: 'advanced',
              fsPath: deletedDbItem.fsPath,
              routePath: deletedDbItem.path,
              type: 'file',
              status: TreeStatus.Deleted,
            },
          ],
        },
      ],
    }])
  })
})

describe('getTreeStatus', () => {
  it('draft is CREATED if originalDatabaseItem is not defined', () => {
    const modified: DatabaseItem = dbItemsList[0] // landing/index.md

    const status = getTreeStatus(modified, undefined)
    expect(status).toBe(TreeStatus.Created)
  })

  it('draft is OPENED if originalDatabaseItem is defined and is the same as draftedDocument', () => {
    const original: DatabaseItem = dbItemsList[0] // landing/index.md

    const status = getTreeStatus(original, original)
    expect(status).toBe(TreeStatus.Opened)
  })

  it('draft is UPDATED if originalDatabaseItem is defined and one of its data field is different from draftedDocument', () => {
    const original: DatabaseItem = dbItemsList[0]
    const modified: DatabaseItem = {
      ...original,
      title: 'New title',
    }

    const status = getTreeStatus(modified, original)
    expect(status).toBe(TreeStatus.Updated)
  })

  it('draft is UPDATED if originalDatabaseItem is defined and its body is different from draftedDocument', () => {
    const original: DatabaseItem = dbItemsList[0]
    const modified: DatabaseItem = {
      ...original,
      body: { type: 'minimark', value: ['New body'] },
    }

    const status = getTreeStatus(modified, original)
    expect(status).toBe(TreeStatus.Updated)
  })

  it('draft is RENAMED if originalDatabaseItem is defined and id is different from draftedDocument', () => {
    const original: DatabaseItem = dbItemsList[0] // landing/index.md
    const modified: DatabaseItem = {
      ...original,
      id: 'landing/renamed.md',
    }

    const status = getTreeStatus(modified, original)
    expect(status).toBe(TreeStatus.Renamed)
  })

  it('draft is DELETED if modifiedDatabaseItem is not defined', () => {
    const original: DatabaseItem = dbItemsList[0] // landing/index.md
    const modified: DatabaseItem = undefined as never

    const status = getTreeStatus(modified, original)
    expect(status).toBe(TreeStatus.Deleted)
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

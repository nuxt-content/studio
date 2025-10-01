import { describe, it, expect } from 'vitest'
import { buildTree, findParentFromId, findItemFromRoute, findItemFromId, findDescendantsFileItemsFromId, getTreeStatus } from '../../src/utils/tree'
import { tree } from '../mocks/tree'
import type { TreeItem } from '../../src/types/tree'
import { dbItemsList, nestedDbItemsList } from '../mocks/database'
import type { DraftItem } from '../../src/types/draft'
import { DraftStatus, TreeStatus, ContentFileExtension } from '../../src/types'
import type { RouteLocationNormalized } from 'vue-router'
import type { DatabaseItem } from '../../src/types/database'

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
    const draftList: DraftItem[] = [{
      id: dbItemsList[0].id,
      fsPath: 'index.md',
      status: DraftStatus.Created,
      original: {
        id: dbItemsList[0].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Created']],
        },
      } as unknown as DatabaseItem,
      modified: {
        id: dbItemsList[0].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Created']],
        },
      } as unknown as DatabaseItem,
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
    const draftList: DraftItem[] = [{
      id: 'docs/1.getting-started/2.deleted.md',
      fsPath: '1.getting-started/2.deleted.md',
      status: DraftStatus.Deleted,
      modified: undefined,
      original: {
        id: 'docs/1.getting-started/2.deleted.md',
        path: '/getting-started/deleted',
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Deleted']],
        },
      } as unknown as DatabaseItem,
    }]

    const tree = buildTree(dbItemsList, draftList)

    expect(tree).toStrictEqual([
      { ...result[0] },
      {
        ...result[1],
        status: TreeStatus.Updated,
        children: [
          ...result[1].children!,
          {
            id: 'docs/1.getting-started/2.deleted.md',
            name: 'deleted',
            fsPath: '1.getting-started/2.deleted.md',
            type: 'file',
            routePath: '/getting-started/deleted',
            status: TreeStatus.Deleted,
          },
        ],
      },
    ])
  })

  it('With DELETED draft file in non existing directory', () => {
    const draftList: DraftItem[] = [{
      id: 'docs/1.deleted-directory/2.deleted-file.md',
      fsPath: '1.deleted-directory/2.deleted-file.md',
      status: DraftStatus.Deleted,
      modified: undefined,
      original: {
        id: 'docs/1.deleted-directory/2.deleted-file.md',
        path: '/deleted-directory/deleted-file',
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Deleted']],
        },
      } as unknown as DatabaseItem,
    }]

    const tree = buildTree(dbItemsList, draftList)

    expect(tree).toStrictEqual([
      ...result,
      {
        id: 'docs/1.deleted-directory',
        name: 'deleted-directory',
        fsPath: '1.deleted-directory',
        routePath: '/deleted-directory',
        type: 'directory',
        status: TreeStatus.Deleted,
        children: [
          {
            id: 'docs/1.deleted-directory/2.deleted-file.md',
            name: 'deleted-file',
            fsPath: '1.deleted-directory/2.deleted-file.md',
            routePath: '/deleted-directory/deleted-file',
            type: 'file',
            status: TreeStatus.Deleted,
          },
        ],
      },
    ])
  })

  it('With UPDATED draft file in existing directory (directory status is set)', () => {
    const draftList: DraftItem[] = [{
      id: dbItemsList[1].id,
      fsPath: '1.getting-started/2.introduction.md',
      status: DraftStatus.Updated,
      original: {
        id: dbItemsList[1].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Original']],
        },
      } as unknown as DatabaseItem,
      modified: {
        id: dbItemsList[1].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Modified']],
        },
      } as unknown as DatabaseItem,
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

  it('With Created and OPENED draft files in exsiting directory (directory status is set)', () => {
    const draftList: DraftItem[] = [{
      id: dbItemsList[1].id,
      fsPath: '1.getting-started/2.introduction.md',
      status: DraftStatus.Created,
      original: {
        id: dbItemsList[1].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Created']],
        },
      } as unknown as DatabaseItem,
      modified: {
        id: dbItemsList[1].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Created']],
        },
      } as unknown as DatabaseItem,
    }, {
      id: dbItemsList[2].id,
      fsPath: '1.getting-started/3.installation.md',
      status: DraftStatus.Opened,
      original: {
        id: dbItemsList[2].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Original']],
        },
      } as unknown as DatabaseItem,
      modified: {
        id: dbItemsList[2].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Original']],
        },
      } as unknown as DatabaseItem,
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
          ...result[1].children!.slice(2),
        ],
      },
    ]

    expect(tree).toStrictEqual(expectedTree)
  })

  it('With OPENED draft files in existing directory (directory status is not set)', () => {
    const draftList: DraftItem[] = [{
      id: dbItemsList[1].id,
      fsPath: '1.getting-started/2.introduction.md',
      status: DraftStatus.Opened,
      original: {
        id: dbItemsList[1].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Original']],
        },
      } as unknown as DatabaseItem,
      modified: {
        id: dbItemsList[1].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Original']],
        },
      } as unknown as DatabaseItem,
    }, {
      id: dbItemsList[2].id,
      fsPath: '1.getting-started/3.installation.md',
      status: DraftStatus.Opened,
      original: {
        id: dbItemsList[2].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Original']],
        },
      } as unknown as DatabaseItem,
      modified: {
        id: dbItemsList[2].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Original']],
        },
      } as unknown as DatabaseItem,
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

  it.only('With same id DELETED and CREATED draft file resulting in RENAMED', () => {
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
    const draftList: DraftItem[] = [{
      id: nestedDbItemsList[0].id,
      fsPath: '1.essentials/2.configuration.md',
      status: DraftStatus.Updated,
      original: {
        id: nestedDbItemsList[0].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Original']],
        },
      } as unknown as DatabaseItem,
      modified: {
        id: nestedDbItemsList[0].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Modified']],
        },
      } as unknown as DatabaseItem,
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
    const draftList: DraftItem[] = [{
      id: nestedDbItemsList[1].id,
      fsPath: '1.essentials/1.nested/2.advanced.md',
      status: DraftStatus.Updated,
      original: {
        id: nestedDbItemsList[1].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Original']],
        },
      } as unknown as DatabaseItem,
      modified: {
        id: nestedDbItemsList[1].id,
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Modified']],
        },
      } as unknown as DatabaseItem,
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

  it ('With DELETED draft file in nested existing directory ', () => {
    const draftList: DraftItem[] = [{
      id: 'docs/1.essentials/1.nested/2.deleted.md',
      fsPath: '1.essentials/1.nested/2.deleted.md',
      status: DraftStatus.Deleted,
      modified: undefined,
      original: {
        id: 'docs/1.essentials/1.nested/2.deleted.md',
        path: '/essentials/nested/deleted',
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Deleted']],
        },
      } as unknown as DatabaseItem,
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
            ...result[0].children![1].children!,
            {
              id: 'docs/1.essentials/1.nested/2.deleted.md',
              name: 'deleted',
              fsPath: '1.essentials/1.nested/2.deleted.md',
              routePath: '/essentials/nested/deleted',
              type: 'file',
              status: TreeStatus.Deleted,
            },
          ],
        },
      ],
    }])
  })

  it ('With DELETED draft file in nested non existing directory', () => {
    const draftList: DraftItem[] = [{
      id: 'docs/1.essentials/1.deleted/1.deleted.md',
      fsPath: '1.essentials/1.deleted/1.deleted.md',
      status: DraftStatus.Deleted,
      modified: undefined,
      original: {
        id: 'docs/1.essentials/1.deleted/1.deleted.md',
        path: '/essentials/deleted/deleted',
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Deleted']],
        },
      } as unknown as DatabaseItem,
    }]

    const tree = buildTree(nestedDbItemsList, draftList)

    expect(tree).toStrictEqual([{
      ...result[0],
      status: TreeStatus.Updated,
      children: [
        result[0].children![0],
        result[0].children![1],
        {
          id: 'docs/1.essentials/1.deleted',
          name: 'deleted',
          fsPath: '1.essentials/1.deleted',
          routePath: '/essentials/deleted',
          type: 'directory',
          status: TreeStatus.Deleted,
          children: [
            {
              id: 'docs/1.essentials/1.deleted/1.deleted.md',
              name: 'deleted',
              fsPath: '1.essentials/1.deleted/1.deleted.md',
              routePath: '/essentials/deleted/deleted',
              type: 'file',
              status: TreeStatus.Deleted,
            },
          ],
        },
      ],
    }])
  })

  it ('With DELETED draft file in multi-nested non existing directory chain', () => {
    const draftList: DraftItem[] = [{
      id: 'docs/1.essentials/1.deep/2.deeper/3.deepest/1.file.md',
      fsPath: '1.essentials/1.deep/2.deeper/3.deepest/1.file.md',
      status: DraftStatus.Deleted,
      modified: undefined,
      original: {
        id: 'docs/1.essentials/1.deep/2.deeper/3.deepest/1.file.md',
        path: '/essentials/deep/deeper/deepest/file',
        extension: ContentFileExtension.Markdown,
        body: {
          type: 'minimark',
          value: [['text', 'Deleted']],
        },
      } as unknown as DatabaseItem,
    }]

    const tree = buildTree(nestedDbItemsList, draftList)

    expect(tree).toStrictEqual([{
      ...result[0],
      status: TreeStatus.Updated,
      children: [
        result[0].children![0],
        result[0].children![1],
        {
          id: 'docs/1.essentials/1.deep',
          name: 'deep',
          fsPath: '1.essentials/1.deep',
          routePath: '/essentials/deep',
          type: 'directory',
          status: TreeStatus.Deleted,
          children: [
            {
              id: 'docs/1.essentials/1.deep/2.deeper',
              name: 'deeper',
              fsPath: '1.essentials/1.deep/2.deeper',
              routePath: '/essentials/deep/deeper',
              type: 'directory',
              status: TreeStatus.Deleted,
              children: [
                {
                  id: 'docs/1.essentials/1.deep/2.deeper/3.deepest',
                  name: 'deepest',
                  fsPath: '1.essentials/1.deep/2.deeper/3.deepest',
                  routePath: '/essentials/deep/deeper/deepest',
                  type: 'directory',
                  status: TreeStatus.Deleted,
                  children: [
                    {
                      id: 'docs/1.essentials/1.deep/2.deeper/3.deepest/1.file.md',
                      name: 'file',
                      fsPath: '1.essentials/1.deep/2.deeper/3.deepest/1.file.md',
                      routePath: '/essentials/deep/deeper/deepest/file',
                      type: 'file',
                      status: TreeStatus.Deleted,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }])
  })
})

describe('getTreeStatus', () => {
  it('draft is CREATED if originalDatabaseItem is not defined', () => {
    const original: DatabaseItem = undefined as never
    const modified: DatabaseItem = {
      id: 'landing/index.md',
      title: 'Home',
      body: {
        type: 'minimark',
        value: [],
      },
      description: 'Home page',
      extension: 'md',
      stem: 'index',
      meta: {},
    }

    const status = getTreeStatus(modified, original)
    expect(status).toBe(TreeStatus.Created)
  })

  it('draft is OPENED if originalDatabaseItem is defined and is the same as draftedDocument', () => {
    const original: DatabaseItem = dbItemsList[0]
    const draft: DatabaseItem = original

    const status = getTreeStatus(draft, original)
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
      body: { type: 'minimark', value: ['text', 'New body'] },
    }

    const status = getTreeStatus(modified, original)
    expect(status).toBe(TreeStatus.Updated)
  })

  it('draft is RENAMED if originalDatabaseItem is defined and id is different from draftedDocument', () => {
    const original: DatabaseItem = dbItemsList[0]
    const modified: DatabaseItem = {
      ...original,
      id: 'landing/renamed.md',
    }

    const status = getTreeStatus(modified, original)
    expect(status).toBe(TreeStatus.Renamed)
  })

  it('draft is DELETED if modifiedDatabaseItem is not defined', () => {
    const original: DatabaseItem = dbItemsList[0]
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

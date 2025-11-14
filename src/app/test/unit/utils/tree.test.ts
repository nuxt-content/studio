import { describe, it, expect } from 'vitest'
import { buildTree, findParentFromFsPath, findItemFromRoute, findItemFromFsPath, findDescendantsFileItemsFromFsPath, getTreeStatus } from '../../../src/utils/tree'
import { tree } from '../../../test/mocks/tree'
import type { TreeItem } from '../../../src/types/tree'
import { dbItemsList, languagePrefixedDbItemsList, nestedDbItemsList } from '../../../test/mocks/database'
import type { DraftItem } from '../../../src/types/draft'
import type { MediaItem } from '../../../src/types'
import { DraftStatus, TreeStatus } from '../../../src/types'
import type { RouteLocationNormalized } from 'vue-router'
import type { DatabaseItem } from '../../../src/types/database'
import { joinURL, withLeadingSlash } from 'ufo'
import { VirtualMediaCollectionName } from '../../../src/utils/media'

describe('buildTree of documents with one level of depth', () => {
  // Result based on dbItemsList mock
  const result: TreeItem[] = [
    {
      name: 'home',
      fsPath: 'index.md',
      type: 'file',
      routePath: '/',
      prefix: null,
    },
    {
      name: 'getting-started',
      fsPath: '1.getting-started',
      type: 'directory',
      prefix: '1',
      children: [
        {
          name: 'introduction',
          fsPath: '1.getting-started/2.introduction.md',
          type: 'file',
          routePath: '/getting-started/introduction',
          prefix: '2',
        },
        {
          name: 'installation',
          fsPath: '1.getting-started/3.installation.md',
          type: 'file',
          routePath: '/getting-started/installation',
          prefix: '3',
        },
      ],
    },
  ]

  it('Without draft', () => {
    const tree = buildTree(dbItemsList, null)
    expect(tree).toStrictEqual(result as TreeItem[])
  })

  it('With draft', () => {
    const createdDbItem: DatabaseItem = dbItemsList[0]

    const draftList: DraftItem[] = [{
      fsPath: createdDbItem.fsPath!,
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
      ...result.slice(1)] as TreeItem[])
  })

  it('With DELETED draft file in existing directory', () => {
    const deletedDbItem: DatabaseItem = dbItemsList[1] // 2.introduction.md

    const draftList: DraftItem[] = [{
      fsPath: deletedDbItem.fsPath!,
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
            name: 'introduction',
            fsPath: deletedDbItem.fsPath!,
            type: 'file',
            routePath: deletedDbItem.path,
            status: TreeStatus.Deleted,
            prefix: '2',
          },
        ],
      },
    ] as TreeItem[])
  })

  it('With DELETED draft file in non existing directory', () => {
    const deletedDbItem: DatabaseItem = dbItemsList[2] // 3.installation.md

    const draftList: DraftItem[] = [{
      fsPath: deletedDbItem.fsPath!,
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
            name: 'installation',
            fsPath: deletedDbItem.fsPath!,
            type: 'file',
            routePath: deletedDbItem.path,
            status: TreeStatus.Deleted,
            prefix: '3',
          },
        ],
      },
    ] as TreeItem[])
  })

  it('With UPDATED draft file in existing directory (directory status is set)', () => {
    const updatedDbItem: DatabaseItem = dbItemsList[1] // 2.introduction.md

    const draftList: DraftItem[] = [{
      fsPath: updatedDbItem.fsPath!,
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

    const expectedTree = [
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

    expect(tree).toStrictEqual(expectedTree as TreeItem[])
  })

  it('With CREATED and OPENED draft files in exsiting directory (directory status is set)', () => {
    const createdDbItem: DatabaseItem = dbItemsList[1] // 2.introduction.md
    const openedDbItem: DatabaseItem = dbItemsList[2] // 3.installation.md

    const draftList: DraftItem[] = [{
      fsPath: createdDbItem.fsPath!,
      status: DraftStatus.Created,
      original: undefined,
      modified: createdDbItem,
    }, {
      fsPath: openedDbItem.fsPath!,
      status: DraftStatus.Pristine,
      original: openedDbItem,
      modified: openedDbItem,
    }]

    const tree = buildTree(dbItemsList, draftList)

    const expectedTree = [
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

    expect(tree).toStrictEqual(expectedTree as TreeItem[])
  })

  it('With OPENED draft files in existing directory (directory status is not set)', () => {
    const openedDbItem1: DatabaseItem = dbItemsList[1] // 2.introduction.md
    const openedDbItem2: DatabaseItem = dbItemsList[2] // 3.installation.md

    const draftList: DraftItem[] = [{
      fsPath: openedDbItem1.fsPath!,
      status: DraftStatus.Pristine,
      original: openedDbItem1,
      modified: openedDbItem1,
    }, {
      fsPath: openedDbItem2.fsPath!,
      status: DraftStatus.Pristine,
      original: openedDbItem2,
      modified: openedDbItem2,
    }]

    const tree = buildTree(dbItemsList, draftList)

    const expectedTree = [
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

    expect(tree).toStrictEqual(expectedTree as TreeItem[])
  })

  it('With same id DELETED and CREATED draft file resulting in RENAMED', () => {
    const deletedDbItem: DatabaseItem = dbItemsList[1] // 2.introduction.md
    const createdDbItem: DatabaseItem = { // 2.renamed.md
      ...dbItemsList[1],
      id: 'docs/1.getting-started/2.renamed.md',
      path: '/getting-started/renamed',
      stem: '1.getting-started/2.renamed',
      fsPath: '1.getting-started/2.renamed.md',
    }

    const draftList: DraftItem[] = [{
      fsPath: deletedDbItem.fsPath!,
      status: DraftStatus.Deleted,
      modified: undefined,
      original: deletedDbItem,
    }, {
      fsPath: createdDbItem.fsPath!,
      status: DraftStatus.Created,
      modified: createdDbItem,
      original: deletedDbItem,
    }]

    // Remove deleted item and replace with created item
    const dbItemsWithoutDeletedWithCreated = dbItemsList.filter(item => item.id !== deletedDbItem.id)
    dbItemsWithoutDeletedWithCreated.push(createdDbItem)

    const tree = buildTree(dbItemsWithoutDeletedWithCreated, draftList)

    expect(tree).toStrictEqual([
      result[0],
      {
        ...result[1],
        status: TreeStatus.Updated,
        children: [
          ...result[1].children!.slice(1),
          {
            fsPath: createdDbItem.fsPath!,
            routePath: createdDbItem.path,
            name: createdDbItem.path!.split('/').pop()!,
            type: 'file',
            status: TreeStatus.Renamed,
            prefix: '2',
          },
        ],
      },
    ] as TreeItem[])
  })
})

describe('buildTree of documents with two levels of depth', () => {
  const result: TreeItem[] = [
    {
      name: 'essentials',
      fsPath: '1.essentials',
      type: 'directory',
      prefix: '1',
      children: [
        {
          name: 'configuration',
          fsPath: '1.essentials/2.configuration.md',
          type: 'file',
          routePath: '/essentials/configuration',
          prefix: '2',
        },
        {
          name: 'nested',
          fsPath: '1.essentials/1.nested',
          type: 'directory',
          prefix: '1',
          children: [
            {
              name: 'advanced',
              fsPath: '1.essentials/1.nested/2.advanced.md',
              type: 'file',
              routePath: '/essentials/nested/advanced',
              prefix: '2',
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
    const updatedDbItem: DatabaseItem = nestedDbItemsList[0] // 1.essentials/2.configuration.md

    const draftList: DraftItem[] = [{
      fsPath: updatedDbItem.fsPath!,
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
    }] as TreeItem[])
  })

  it('With nested levels of depth draft files', () => {
    const updatedDbItem: DatabaseItem = nestedDbItemsList[1] // 1.essentials/1.nested/2.advanced.md

    const draftList: DraftItem[] = [{
      fsPath: updatedDbItem.fsPath!,
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
    }] as TreeItem[])
  })

  it ('With DELETED draft file in nested non existing directory (directory status is set)', () => {
    const deletedDbItem: DatabaseItem = nestedDbItemsList[1] // 1.essentials/1.nested/2.advanced.md

    const draftList: DraftItem[] = [{
      fsPath: deletedDbItem.fsPath!,
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
              name: 'advanced',
              fsPath: deletedDbItem.fsPath!,
              routePath: deletedDbItem.path,
              type: 'file',
              status: TreeStatus.Deleted,
              prefix: '2',
            },
          ],
        },
      ],
    }] as TreeItem[])
  })
})

describe('buildTree of documents with language prefixed', () => {
  const result: TreeItem[] = [
    {
      name: 'en',
      fsPath: 'en',
      type: 'directory',
      prefix: null,
      children: [
        {
          name: 'index',
          fsPath: 'en/index.md',
          prefix: null,
          type: 'file',
          routePath: '/en',
        },
        {
          name: 'getting-started',
          fsPath: 'en/1.getting-started',
          type: 'directory',
          prefix: '1',
          children: [
            {
              name: 'introduction',
              fsPath: 'en/1.getting-started/2.introduction.md',
              type: 'file',
              routePath: '/en/getting-started/introduction',
              prefix: '2',
            },
            {
              name: 'installation',
              fsPath: 'en/1.getting-started/3.installation.md',
              type: 'file',
              routePath: '/en/getting-started/installation',
              prefix: '3',
            },
          ],
        },
      ],
    },
  ]

  it('Without draft', () => {
    const tree = buildTree(languagePrefixedDbItemsList, null)
    expect(tree).toStrictEqual(result)
  })
})

describe('buildTree of medias', () => {
  it('With .gitkeep file in directory (file is marked as hidden)', () => {
    const mediaFolderName = 'media-folder'
    const gitKeepFsPath = joinURL(mediaFolderName, '.gitkeep')
    const mediaFsPath = joinURL(mediaFolderName, 'image.jpg')
    const mediaId = joinURL(VirtualMediaCollectionName, mediaFsPath)
    const gitKeepId = joinURL(VirtualMediaCollectionName, gitKeepFsPath)

    const gitkeepDbItem: MediaItem = {
      id: gitKeepId,
      fsPath: gitKeepFsPath,
      stem: '.gitkeep',
      extension: 'gitkeep',
      path: withLeadingSlash(gitKeepFsPath),
    }

    const mediaDbItem: MediaItem = {
      id: mediaId,
      fsPath: mediaFsPath,
      stem: 'image',
      extension: 'jpg',
      path: withLeadingSlash(mediaFsPath),
    }

    const draftList: DraftItem[] = [{
      fsPath: gitkeepDbItem.fsPath!,
      status: DraftStatus.Created,
      original: undefined,
      modified: gitkeepDbItem,
    }]

    const tree = buildTree([gitkeepDbItem, mediaDbItem], draftList)

    expect(tree).toHaveLength(1)
    expect(tree[0]).toHaveProperty('fsPath', mediaFolderName)
    expect(tree[0].children).toHaveLength(2)

    const gitkeepFile = tree[0].children!.find(item => item.fsPath === gitKeepFsPath)
    const imageFile = tree[0].children!.find(item => item.fsPath === mediaFsPath)

    expect(gitkeepFile).toHaveProperty('hide', true)
    expect(imageFile).toBeDefined()
    expect(imageFile!.hide).toBeUndefined()
  })
})

describe('getTreeStatus', () => {
  it('should return OPENED when draft status is Pristine', () => {
    const draftItem: DraftItem = {
      fsPath: 'index.md',
      status: DraftStatus.Pristine,
      original: dbItemsList[0],
      modified: dbItemsList[0],
    }

    const status = getTreeStatus(draftItem)
    expect(status).toBe(TreeStatus.Opened)
  })

  it('should return DELETED when draft status is Deleted', () => {
    const draftItem: DraftItem = {
      fsPath: 'index.md',
      status: DraftStatus.Deleted,
      original: dbItemsList[0],
      modified: undefined,
    }

    const status = getTreeStatus(draftItem)
    expect(status).toBe(TreeStatus.Deleted)
  })

  it('should return UPDATED when draft status is Updated', () => {
    const original: DatabaseItem = dbItemsList[0]
    const modified: DatabaseItem = {
      ...original,
      title: 'New title',
    }

    const draftItem: DraftItem = {
      fsPath: 'index.md',
      status: DraftStatus.Updated,
      original,
      modified,
    }

    const status = getTreeStatus(draftItem)
    expect(status).toBe(TreeStatus.Updated)
  })

  it('should return RENAMED when draft status is Created and original.id differs from modified.id', () => {
    const original: DatabaseItem = dbItemsList[0] // index.md
    const modified: DatabaseItem = {
      ...original,
      id: 'renamed.md',
    }

    const draftItem: DraftItem = {
      fsPath: 'renamed.md',
      status: DraftStatus.Created,
      original,
      modified,
    }

    const status = getTreeStatus(draftItem)
    expect(status).toBe(TreeStatus.Renamed)
  })

  it('should return CREATED when draft status is Created without original', () => {
    const draftItem: DraftItem = {
      fsPath: 'index.md',
      status: DraftStatus.Created,
      original: undefined,
      modified: dbItemsList[0],
    }

    const status = getTreeStatus(draftItem)
    expect(status).toBe(TreeStatus.Created)
  })

  it('should return CREATED when draft status is Created with original that has same id', () => {
    const original: DatabaseItem = dbItemsList[0]
    const modified: DatabaseItem = dbItemsList[0]

    const draftItem: DraftItem = {
      fsPath: 'index.md',
      status: DraftStatus.Created,
      original,
      modified,
    }

    const status = getTreeStatus(draftItem)
    expect(status).toBe(TreeStatus.Created)
  })
})

describe('findParentFromFsPath', () => {
  it('should find direct parent of a child', () => {
    const parent = findParentFromFsPath(tree, '1.getting-started/2.introduction.md')
    expect(parent).toBeDefined()
    expect(parent?.fsPath).toBe('1.getting-started')
  })

  it('should find nested parent', () => {
    const parent = findParentFromFsPath(tree, '1.getting-started/1.advanced/1.studio.md')
    expect(parent).toBeDefined()
    expect(parent?.fsPath).toBe('1.getting-started/1.advanced')
  })

  it('should return null for root level items', () => {
    const parent = findParentFromFsPath(tree, 'index.md')
    expect(parent).toBeNull()
  })

  it('should return null for non-existent items', () => {
    const parent = findParentFromFsPath(tree, 'non/existent/item.md')
    expect(parent).toBeNull()
  })

  it('should return null for empty tree', () => {
    const parent = findParentFromFsPath([], 'any/item.md')
    expect(parent).toBeNull()
  })
})

describe('findItemFromRoute', () => {
  const mockRoute = (path: string) => ({ path }) as RouteLocationNormalized

  it('should find root level file by path', () => {
    const route = mockRoute('/')
    const item = findItemFromRoute(tree, route)
    expect(item).toBeDefined()
    expect(item?.fsPath).toBe('index.md')
    expect(item?.name).toBe('home')
  })

  it('should find nested file by path', () => {
    const route = mockRoute('/getting-started/introduction')
    const item = findItemFromRoute(tree, route)
    expect(item).toBeDefined()
    expect(item?.fsPath).toBe('1.getting-started/2.introduction.md')
    expect(item?.name).toBe('introduction')
  })

  it('should find deeply nested file by path', () => {
    const route = mockRoute('/getting-started/installation/advanced/studio')
    const item = findItemFromRoute(tree, route)
    expect(item).toBeDefined()
    expect(item?.fsPath).toBe('1.getting-started/1.advanced/1.studio.md')
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

describe('findItemFromFsPath', () => {
  it('should find root level item by fsPath', () => {
    const item = findItemFromFsPath(tree, 'index.md')
    expect(item).toBeDefined()
    expect(item?.fsPath).toBe('index.md')
    expect(item?.name).toBe('home')
    expect(item?.type).toBe('file')
  })

  it('should find nested file by fsPath', () => {
    const item = findItemFromFsPath(tree, '1.getting-started/2.introduction.md')
    expect(item).toBeDefined()
    expect(item?.fsPath).toBe('1.getting-started/2.introduction.md')
    expect(item?.name).toBe('introduction')
    expect(item?.type).toBe('file')
  })

  it('should find directory by fsPath', () => {
    const item = findItemFromFsPath(tree, '1.getting-started')
    expect(item).toBeDefined()
    expect(item?.fsPath).toBe('1.getting-started')
    expect(item?.name).toBe('getting-started')
    expect(item?.type).toBe('directory')
    expect(item?.children).toBeDefined()
  })

  it('should find deeply nested item by fsPath', () => {
    const item = findItemFromFsPath(tree, '1.getting-started/1.advanced/1.studio.md')
    expect(item).toBeDefined()
    expect(item?.fsPath).toBe('1.getting-started/1.advanced/1.studio.md')
    expect(item?.name).toBe('studio')
    expect(item?.type).toBe('file')
  })

  it('should find nested directory by fsPath', () => {
    const item = findItemFromFsPath(tree, '1.getting-started/1.advanced')
    expect(item).toBeDefined()
    expect(item?.fsPath).toBe('1.getting-started/1.advanced')
    expect(item?.name).toBe('advanced')
    expect(item?.type).toBe('directory')
  })

  it('should return null for non-existent fsPath', () => {
    const item = findItemFromFsPath(tree, 'non/existent/item.md')
    expect(item).toBeNull()
  })

  it('should return null for partial fsPath match', () => {
    const item = findItemFromFsPath(tree, '1.getting-started/2.introduction')
    expect(item).toBeNull()
  })

  it('should return null for empty tree', () => {
    const item = findItemFromFsPath([], 'any/item.md')
    expect(item).toBeNull()
  })

  it('should return null for empty fsPath', () => {
    const item = findItemFromFsPath(tree, '')
    expect(item).toBeNull()
  })
})

describe('findDescendantsFileItemsFromFsPath', () => {
  it('returns exact match for a root level file', () => {
    const descendants = findDescendantsFileItemsFromFsPath(tree, 'index.md')
    expect(descendants).toHaveLength(1)
    expect(descendants[0].fsPath).toBe('index.md')
  })

  it('returns empty array for non-existent id', () => {
    const descendants = findDescendantsFileItemsFromFsPath(tree, 'non-existent/file.md')
    expect(descendants).toHaveLength(0)
  })

  it('returns all descendants files for directory id', () => {
    const descendants = findDescendantsFileItemsFromFsPath(tree, '1.getting-started')

    expect(descendants).toHaveLength(3)

    expect(descendants.some(item => item.fsPath === '1.getting-started/2.introduction.md')).toBe(true)
    expect(descendants.some(item => item.fsPath === '1.getting-started/3.installation.md')).toBe(true)
    expect(descendants.some(item => item.fsPath === '1.getting-started/1.advanced/1.studio.md')).toBe(true)
  })

  it('returns all descendants files for nested directory id', () => {
    const descendants = findDescendantsFileItemsFromFsPath(tree, '1.getting-started/1.advanced')

    expect(descendants).toHaveLength(1)

    expect(descendants.some(item => item.fsPath === '1.getting-started/1.advanced/1.studio.md')).toBe(true)
  })

  it('returns only the file itself when searching for a specific file', () => {
    const descendants = findDescendantsFileItemsFromFsPath(tree, '1.getting-started/2.introduction.md')

    expect(descendants).toHaveLength(1)
    expect(descendants[0].fsPath).toBe('1.getting-started/2.introduction.md')
  })

  it('returns deeply nested file when searching by specific file id', () => {
    const descendants = findDescendantsFileItemsFromFsPath(tree, '1.getting-started/1.advanced/1.studio.md')

    expect(descendants).toHaveLength(1)
    expect(descendants[0].fsPath).toBe('1.getting-started/1.advanced/1.studio.md')
  })
})

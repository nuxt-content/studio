import {
  ContentFileExtension,
  DraftStatus,
  TreeStatus,
  type DatabasePageItem,
  type DraftItem,
  type TreeItem,
} from '../types'
import { withLeadingSlash } from 'ufo'
import type { RouteLocationNormalized } from 'vue-router'
import type { BaseItem } from '../types/item'
import { isEqual } from './database'
import { studioFlags } from '../composables/useStudio'
import { getFileExtension, parseName } from './file'

export const COLOR_STATUS_MAP: { [key in TreeStatus]?: string } = {
  [TreeStatus.Created]: 'green',
  [TreeStatus.Updated]: 'orange',
  [TreeStatus.Deleted]: 'red',
  [TreeStatus.Renamed]: 'blue',
  [TreeStatus.Opened]: 'gray',
} as const

export const COLOR_UI_STATUS_MAP: { [key in TreeStatus]?: string } = {
  [TreeStatus.Created]: 'success',
  [TreeStatus.Updated]: 'warning',
  [TreeStatus.Deleted]: 'error',
  [TreeStatus.Renamed]: 'info',
  [TreeStatus.Opened]: 'neutral',
} as const

export function buildTree(dbItems: ((BaseItem) & { fsPath: string })[], draftList: DraftItem[] | null):
TreeItem[] {
  const tree: TreeItem[] = []
  const directoryMap = new Map<string, TreeItem>()

  const deletedDraftItems = draftList?.filter(draft => draft.status === DraftStatus.Deleted) || []
  const createdDraftItems = draftList?.filter(draft => draft.status === DraftStatus.Created) || []

  function addDeletedDraftItemsInDbItems(dbItems: ((BaseItem) & { fsPath: string })[], deletedItems: DraftItem[]) {
    dbItems = [...dbItems]
    for (const deletedItem of deletedItems) {
      // Files in both deleted and original created draft are considered as renamed
      // We don't want to add them to the tree and duplicate them
      const renamedDraftItem = createdDraftItems.find(createdDraftItem => createdDraftItem.original?.id === deletedItem.id)
      if (renamedDraftItem) {
        continue
      }

      const virtualDbItems: BaseItem & { fsPath: string } = {
        id: deletedItem.id,
        extension: getFileExtension(deletedItem.id),
        stem: '',
        fsPath: deletedItem.fsPath,
        path: deletedItem.original?.path,
      }

      dbItems.push(virtualDbItems)
    }

    return dbItems
  }

  const virtualDbItems = addDeletedDraftItemsInDbItems(dbItems, deletedDraftItems)

  for (const dbItem of virtualDbItems) {
    const itemHasPathField = 'path' in dbItem && dbItem.path
    const fsPathSegments = dbItem.fsPath.split('/').filter(Boolean)
    const directorySegments = fsPathSegments.slice(0, -1)
    let fileName = fsPathSegments[fsPathSegments.length - 1].replace(/\.[^/.]+$/, '')

    let routePathSegments: string[] | undefined
    if (itemHasPathField) {
      routePathSegments = (dbItem.path as string).split('/').slice(0, -1).filter(Boolean)
    }

    /*****************
    Generate root file
    ******************/
    if (directorySegments.length === 0) {
      const { name, prefix } = parseName(fileName)
      fileName = name === 'index' ? 'home' : name

      const fileItem: TreeItem = {
        id: dbItem.id,
        name: fileName,
        fsPath: dbItem.fsPath,
        type: 'file',
        prefix,
      }

      if (itemHasPathField) {
        fileItem.routePath = dbItem.path as string
      }

      const draftFileItem = draftList?.find(draft => draft.id === dbItem.id)
      if (draftFileItem) {
        fileItem.status = getTreeStatus(draftFileItem.modified!, draftFileItem.original!)
      }

      tree.push(fileItem)
      continue
    }

    /*****************
    Generate directory
    ******************/
    function dirIdBuilder(index: number) {
      const idSegments = dbItem.id.split('/')
      const stemVsIdGap = idSegments.length - fsPathSegments.length
      return idSegments.slice(0, index + stemVsIdGap + 1).join('/')
    }

    function dirFsPathBuilder(index: number) {
      return directorySegments.slice(0, index + 1).join('/')
    }

    function dirRoutePathBuilder(index: number) {
      return withLeadingSlash(routePathSegments!.slice(0, index + 1).join('/'))
    }

    let directoryChildren = tree
    for (let i = 0; i < directorySegments.length; i++) {
      const { name: dirName, prefix: dirPrefix } = parseName(directorySegments[i])
      const dirId = dirIdBuilder(i)
      const dirFsPath = dirFsPathBuilder(i)

      // Only create directory if it doesn't exist
      let directory = directoryMap.get(dirId)
      if (!directory) {
        directory = {
          id: dirId,
          name: dirName,
          fsPath: dirFsPath,
          type: 'directory',
          children: [],
          prefix: dirPrefix,
        }

        if (itemHasPathField) {
          directory.routePath = dirRoutePathBuilder(i)
        }

        directoryMap.set(dirId, directory)

        if (!directoryChildren.find(child => child.id === dirId)) {
          directoryChildren.push(directory)
        }
      }

      directoryChildren = directory.children!
    }

    /****************************************
    Generate file in directory (last segment)
    ******************************************/
    const { name, prefix } = parseName(fileName)
    const fileItem: TreeItem = {
      id: dbItem.id,
      name,
      fsPath: dbItem.fsPath,
      type: 'file',
      prefix,
    }

    const draftFileItem = draftList?.find(draft => draft.id === dbItem.id)
    if (draftFileItem) {
      fileItem.status = getTreeStatus(draftFileItem.modified!, draftFileItem.original!)
    }

    if (dbItem.path) {
      fileItem.routePath = dbItem.path as string
    }

    directoryChildren.push(fileItem)
  }

  calculateDirectoryStatuses(tree)

  return tree
}

export function getTreeStatus(modified?: BaseItem, original?: BaseItem): TreeStatus {
  if (studioFlags.dev) {
    return TreeStatus.Opened
  }

  if (!original && !modified) {
    throw new Error('Unconsistent state: both modified and original are undefined')
  }

  if (!original) {
    return TreeStatus.Created
  }

  if (!modified) {
    return TreeStatus.Deleted
  }

  if (modified.id !== original.id) {
    return TreeStatus.Renamed
  }

  if (original.extension === ContentFileExtension.Markdown) {
    if (!isEqual(original as DatabasePageItem, modified as DatabasePageItem)) {
      return TreeStatus.Updated
    }
  }
  else {
    if (JSON.stringify(original) !== JSON.stringify(modified)) {
      return TreeStatus.Updated
    }
  }

  return TreeStatus.Opened
}

export function findItemFromId(tree: TreeItem[], id: string): TreeItem | null {
  for (const item of tree) {
    if (item.id === id) {
      return item
    }

    if (item.children) {
      const foundInChildren = findItemFromId(item.children, id)
      if (foundInChildren) {
        return foundInChildren
      }
    }
  }

  return null
}

export function findParentFromId(tree: TreeItem[], id: string): TreeItem | null {
  for (const item of tree) {
    if (item.children) {
      for (const child of item.children) {
        if (child.id === id) {
          return item
        }
      }

      const foundParent = findParentFromId(item.children, id)
      if (foundParent) {
        return foundParent
      }
    }
  }

  // Not found in this branch
  return null
}

export function findItemFromRoute(tree: TreeItem[], route: RouteLocationNormalized): TreeItem | null {
  for (const item of tree) {
    if (item.routePath === route.path) {
      return item
    }

    if (item.type === 'directory' && item.children) {
      const foundInChildren = findItemFromRoute(item.children, route)
      if (foundInChildren) {
        return foundInChildren
      }
    }
  }

  return null
}

export function findDescendantsFileItemsFromId(tree: TreeItem[], id: string): TreeItem[] {
  const descendants: TreeItem[] = []

  function traverse(items: TreeItem[]) {
    for (const item of items) {
      // Check if this item matches the id or is a descendant of it
      if (item.id === id || item.id.startsWith(id + '/')) {
        if (item.type === 'file') {
          descendants.push(item)
        }

        // If this item has children, add all of them as descendants
        if (item.children) {
          getAllDescendants(item.children, descendants)
        }
      }
      else if (item.children) {
        // Continue searching in children
        traverse(item.children)
      }
    }
  }

  function getAllDescendants(items: TreeItem[], result: TreeItem[]) {
    for (const item of items) {
      if (item.type === 'file') {
        result.push(item)
      }

      if (item.children) {
        getAllDescendants(item.children, result)
      }
    }
  }

  traverse(tree)

  return descendants
}

function calculateDirectoryStatuses(items: TreeItem[]) {
  if (studioFlags.dev) {
    return
  }

  for (const item of items) {
    if (item.type === 'file' || !item.children) {
      continue
    }

    calculateDirectoryStatuses(item.children)

    const childrenWithStatus = item.children.filter(child => child.status && child.status !== TreeStatus.Opened)

    if (childrenWithStatus.length > 0) {
      item.status = TreeStatus.Updated

      const allChildrenHaveStatus = childrenWithStatus.length === item.children.length

      if (allChildrenHaveStatus) {
        if (childrenWithStatus.every(child => child.status === TreeStatus.Deleted)) {
          item.status = TreeStatus.Deleted
        }
        else if (childrenWithStatus.every(child => child.status === TreeStatus.Renamed)) {
          item.status = TreeStatus.Renamed
        }
        else if (childrenWithStatus.every(child => child.status === TreeStatus.Created)) {
          item.status = TreeStatus.Created
        }
      }
    }
  }
}

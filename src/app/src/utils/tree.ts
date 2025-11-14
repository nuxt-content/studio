import {
  DraftStatus,
  TreeStatus,
  type DraftItem,
  type TreeItem,
} from '../types'
import type { RouteLocationNormalized } from 'vue-router'
import type { BaseItem } from '../types/item'
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

export function buildTree(dbItems: BaseItem[], draftList: DraftItem[] | null, isDev = false):
TreeItem[] {
  const tree: TreeItem[] = []
  const directoryMap = new Map<string, TreeItem>()

  const deletedDraftItems = draftList?.filter(draft => draft.status === DraftStatus.Deleted) || []
  const createdDraftItems = draftList?.filter(draft => draft.status === DraftStatus.Created) || []

  function addDeletedDraftItemsInDbItems(dbItems: BaseItem[], deletedItems: DraftItem[]) {
    dbItems = [...dbItems]
    for (const deletedItem of deletedItems) {
      // TODO: createdDraftItem.original?.fsPath is null ATM
      // Files in both deleted and original created draft are considered as renamed
      // We don't want to add them to the tree and duplicate them
      const renamedDraftItem = createdDraftItems.find(createdDraftItem => createdDraftItem.original?.fsPath === deletedItem.fsPath)
      if (renamedDraftItem) {
        continue
      }

      const virtualDbItem: BaseItem = {
        id: 'N/A',
        fsPath: deletedItem.fsPath,
        extension: getFileExtension(deletedItem.fsPath),
        stem: '',
        path: deletedItem.original?.path,
      }

      dbItems.push(virtualDbItem)
    }

    return dbItems
  }

  const virtualDbItems = addDeletedDraftItemsInDbItems(dbItems, deletedDraftItems)

  for (const dbItem of virtualDbItems) {
    const itemHasPathField = 'path' in dbItem && dbItem.path
    const fsPathSegments = dbItem.fsPath!.split('/').filter(Boolean)
    const directorySegments = fsPathSegments.slice(0, -1)
    let fileName = fsPathSegments[fsPathSegments.length - 1].replace(/\.[^/.]+$/, '')

    /*****************
    Generate root file
    ******************/
    if (directorySegments.length === 0) {
      const { name, prefix } = parseName(fileName)
      fileName = name === 'index' ? 'home' : name
      const fileItem: TreeItem = {
        name: fileName,
        fsPath: dbItem.fsPath!,
        type: 'file',
        prefix,
      }

      if (dbItem.fsPath!.endsWith('.gitkeep')) {
        fileItem.hide = true
      }

      if (itemHasPathField) {
        fileItem.routePath = dbItem.path as string
      }

      const draftFileItem = draftList?.find(draft => draft.fsPath === dbItem.fsPath)
      if (draftFileItem) {
        fileItem.status = getTreeStatus(draftFileItem)
      }

      tree.push(fileItem)
      continue
    }

    /*****************
    Generate directory
    ******************/
    function dirFsPathBuilder(index: number) {
      return directorySegments.slice(0, index + 1).join('/')
    }

    let directoryChildren = tree
    for (let i = 0; i < directorySegments.length; i++) {
      const { name: dirName, prefix: dirPrefix } = parseName(directorySegments[i])
      const dirFsPath = dirFsPathBuilder(i)

      // Only create directory if it doesn't exist
      let directory = directoryMap.get(dirFsPath)
      if (!directory) {
        directory = {
          name: dirName,
          fsPath: dirFsPath,
          type: 'directory',
          children: [],
          prefix: dirPrefix,
        }

        directoryMap.set(dirFsPath, directory)

        if (!directoryChildren.find(child => child.fsPath === dirFsPath)) {
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
      name,
      fsPath: dbItem.fsPath!,
      type: 'file',
      prefix,
    }

    if (dbItem.fsPath!.endsWith('.gitkeep')) {
      fileItem.hide = true
    }

    const draftFileItem = draftList?.find(draft => draft.fsPath === dbItem.fsPath)
    if (draftFileItem) {
      fileItem.status = getTreeStatus(draftFileItem)
    }

    if (dbItem.path) {
      fileItem.routePath = dbItem.path as string
    }

    directoryChildren.push(fileItem)
  }

  calculateDirectoryStatuses(tree, isDev)

  return tree
}

export function getTreeStatus(draftItem: DraftItem): TreeStatus {
  if (draftItem.status === DraftStatus.Pristine) {
    return TreeStatus.Opened
  }

  if (draftItem.status === DraftStatus.Deleted) {
    return TreeStatus.Deleted
  }

  if (draftItem.status === DraftStatus.Updated) {
    return TreeStatus.Updated
  }

  if (draftItem.status === DraftStatus.Created) {
    const { original, modified } = draftItem
    if (original && modified && original.id !== modified.id) {
      return TreeStatus.Renamed
    }
    return TreeStatus.Created
  }

  return TreeStatus.Opened
}

export function findItemFromFsPath(tree: TreeItem[], fsPath: string): TreeItem | null {
  for (const item of tree) {
    if (item.fsPath === fsPath) {
      return item
    }

    if (item.children) {
      const foundInChildren = findItemFromFsPath(item.children, fsPath)
      if (foundInChildren) {
        return foundInChildren
      }
    }
  }

  return null
}

export function findParentFromFsPath(tree: TreeItem[], fsPath: string): TreeItem | null {
  for (const item of tree) {
    if (item.children) {
      for (const child of item.children) {
        if (child.fsPath === fsPath) {
          return item
        }
      }

      const foundParent = findParentFromFsPath(item.children, fsPath)
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

export function findDescendantsFileItemsFromFsPath(tree: TreeItem[], fsPath: string): TreeItem[] {
  const descendants: TreeItem[] = []

  function traverse(items: TreeItem[]) {
    for (const item of items) {
      // File type
      if (item.type === 'file') {
        const isExactItem = item.fsPath === fsPath
        const isDescendant = item.fsPath.startsWith(fsPath + '/')
        if (isExactItem || isDescendant) {
          descendants.push(item)
        }
      }
      // Directory type
      else {
        // Directory found, add all children as descendants
        if (item.fsPath === fsPath) {
          getAllDescendants(item.children!, descendants)
        }
        // Keep browsing children
        else if (item.children) {
          traverse(item.children)
        }
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

function calculateDirectoryStatuses(items: TreeItem[], isDev = false) {
  if (isDev) {
    return
  }

  for (const item of items) {
    if (item.type === 'file' || !item.children) {
      continue
    }

    calculateDirectoryStatuses(item.children, isDev)

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

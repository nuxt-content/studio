import { DraftStatus, type DraftItem, type TreeItem } from '../types'
import { withLeadingSlash } from 'ufo'
import { stripNumericPrefix } from './string'
import type { RouteLocationNormalized } from 'vue-router'
import type { BaseItem } from '../types/item'

export const ROOT_ITEM: TreeItem = { id: 'root', name: 'content', fsPath: '/', type: 'root' }

export const EXTENSIONS_WITH_PREVIEW = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'ico',
  'avif',
])

export function buildTree(dbItems: ((BaseItem) & { fsPath: string })[], draftList: DraftItem[] | null):
TreeItem[] {
  const tree: TreeItem[] = []
  const directoryMap = new Map<string, TreeItem>()

  const deletedDraftItems = draftList?.filter(draft => draft.status === DraftStatus.Deleted) || []
  const updatedDraftItems = draftList?.filter(draft => draft.status !== DraftStatus.Deleted) || []

  for (const dbItem of dbItems) {
    const itemHasPathField = 'path' in dbItem && dbItem.path
    const fsPathSegments = dbItem.fsPath.split('/')
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
      fileName = fileName === 'index' ? 'home' : stripNumericPrefix(fileName)

      const fileItem: TreeItem = {
        id: dbItem.id,
        name: fileName,
        fsPath: dbItem.fsPath,
        type: 'file',
      }

      // Public assets
      if (dbItem.id.startsWith('public-assets/')) {
        fileItem.preview = EXTENSIONS_WITH_PREVIEW.has(dbItem.extension) ? dbItem.path : undefined
      }

      if (itemHasPathField) {
        fileItem.routePath = dbItem.path as string
      }

      const draftFileItem = updatedDraftItems?.find(draft => draft.id === dbItem.id)
      if (draftFileItem) {
        fileItem.status = draftFileItem.status
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
      const dirName = stripNumericPrefix(directorySegments[i])
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
    const fileItem: TreeItem = {
      id: dbItem.id,
      name: stripNumericPrefix(fileName),
      fsPath: dbItem.fsPath,
      type: 'file',
    }

    const draftFileItem = updatedDraftItems?.find(draft => draft.id === dbItem.id)
    if (draftFileItem) {
      fileItem.status = draftFileItem.status
    }

    if (dbItem.path) {
      fileItem.routePath = dbItem.path as string
    }

    directoryChildren.push(fileItem)
  }

  addDeletedDraftItems(tree, deletedDraftItems)

  calculateDirectoryStatuses(tree)

  return tree
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
  for (const item of items) {
    if (item.type === 'directory' && item.children) {
      calculateDirectoryStatuses(item.children)

      const childrenWithStatus = item.children.filter(child => child.status && child.status !== DraftStatus.Opened)

      if (childrenWithStatus.length > 0) {
        // Check if ALL children with status are deleted
        const allDeleted = childrenWithStatus.every(child => child.status === DraftStatus.Deleted)

        if (allDeleted && childrenWithStatus.length === item.children.length) {
          // If all children are deleted, mark directory as deleted
          item.status = DraftStatus.Deleted
        }
        else {
          // Otherwise, mark as updated
          item.status = DraftStatus.Updated
        }
      }
    }
  }
}

function addDeletedDraftItems(tree: TreeItem[], deletedItems: DraftItem[]) {
  for (const deletedItem of deletedItems) {
    const existingItem = findItemFromId(tree, deletedItem.id)

    // Update existing item status to Deleted
    if (existingItem) {
      existingItem.status = DraftStatus.Deleted
    }
    // Create new deleted item
    else {
      const idSegments = deletedItem.id.split('/')
      const fsPathSegments = deletedItem.fsPath.split('/')
      const fileName = idSegments[idSegments.length - 1]
      const fileNameWithoutExtension = fileName.replace(/\.[^/.]+$/, '')

      const parentId = idSegments.slice(0, -1).join('/')
      const parentDir = findItemFromId(tree, parentId)

      // Add to existing directory
      if (parentDir) {
        const deletedTreeItem: TreeItem = {
          id: deletedItem.id,
          name: stripNumericPrefix(fileNameWithoutExtension),
          fsPath: deletedItem.fsPath,
          type: 'file',
          status: DraftStatus.Deleted,
        }

        if (parentDir.routePath) {
          deletedTreeItem.routePath = `${parentDir.routePath}/${stripNumericPrefix(fileNameWithoutExtension)}`
        }

        parentDir.children!.push(deletedTreeItem)
      }
      // Create parent directories chain
      else {
        let existingParent: TreeItem | null = null
        let existingParentLevel = -1

        // Find the deepest existing parent directory
        for (let i = idSegments.length - 2; i >= 0; i--) {
          const potentialParentId = idSegments.slice(0, i + 1).join('/')
          const potentialParent = findItemFromId(tree, potentialParentId)
          if (potentialParent && potentialParent.type === 'directory') {
            existingParent = potentialParent
            existingParentLevel = i
            break
          }
        }

        // If we found an existing ancestor, create parent directories chain
        if (existingParent) {
          let currentParent = existingParent
          let currentChildren = existingParent.children!

          const idFsPathOffset = idSegments.length - fsPathSegments.length

          // Create missing intermediate directories
          for (let i = existingParentLevel + 1; i < idSegments.length - 1; i++) {
            const dirId = idSegments.slice(0, i + 1).join('/')
            const fsPathIndex = i - idFsPathOffset

            const dirFsPath = fsPathIndex >= 0
              ? fsPathSegments.slice(0, fsPathIndex + 1).join('/')
              : ''
            const dirName = fsPathIndex >= 0
              ? stripNumericPrefix(fsPathSegments[fsPathIndex])
              : stripNumericPrefix(idSegments[i])

            const newDir: TreeItem = {
              id: dirId,
              name: dirName,
              fsPath: dirFsPath,
              type: 'directory',
              status: DraftStatus.Deleted,
              children: [],
            }

            if (currentParent.routePath) {
              newDir.routePath = `${currentParent.routePath}/${dirName}`
            }

            currentChildren.push(newDir)
            currentParent = newDir
            currentChildren = newDir.children!
          }

          // Create the deleted file in the last directory
          const deletedTreeItem: TreeItem = {
            id: deletedItem.id,
            name: stripNumericPrefix(fileNameWithoutExtension),
            fsPath: deletedItem.fsPath,
            type: 'file',
            status: DraftStatus.Deleted,
          }

          if (currentParent.routePath) {
            deletedTreeItem.routePath = `${currentParent.routePath}/${stripNumericPrefix(fileNameWithoutExtension)}`
          }

          currentChildren.push(deletedTreeItem)
        }
        // No existing parent found - create at root level
        else {
          const parentFsPath = deletedItem.fsPath.split('/').slice(0, -1).join('/')

          const newDir: TreeItem = {
            id: parentId,
            name: stripNumericPrefix(parentFsPath.split('/').pop()!),
            fsPath: parentFsPath,
            type: 'directory',
            status: DraftStatus.Deleted,
            children: [{
              id: deletedItem.id,
              name: stripNumericPrefix(fileNameWithoutExtension),
              fsPath: deletedItem.fsPath,
              type: 'file',
              status: DraftStatus.Deleted,
            }],
          }

          tree.push(newDir)
        }
      }
    }
  }
}

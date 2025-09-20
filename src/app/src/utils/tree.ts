import { DraftStatus, type DatabaseItem, type DraftFileItem, type TreeItem } from '../types'
import { withLeadingSlash } from 'ufo'
import { stripNumericPrefix } from './string'
import type { RouteLocationNormalized } from 'vue-router'

export const ROOT_ITEM: TreeItem = { id: 'root', name: 'content', fsPath: '/', type: 'root' }

export function buildTree(dbItems: (DatabaseItem & { fsPath: string })[], draftList: DraftFileItem[] | null):
TreeItem[] {
  const tree: TreeItem[] = []
  const directoryMap = new Map<string, TreeItem>()

  for (const dbItem of dbItems) {
    const collectionType = dbItem.path ? 'page' : 'data'
    const fsPathSegments = dbItem.fsPath.split('/')
    const directorySegments = fsPathSegments.slice(0, -1)
    let fileName = fsPathSegments[fsPathSegments.length - 1].replace(/\.[^/.]+$/, '')

    let routePathSegments: string[] | undefined
    if (collectionType === 'page') {
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

      if (collectionType === 'page') {
        fileItem.routePath = dbItem.path as string
      }

      const draftFileItem = draftList?.find(draft => draft.id === dbItem.id)
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

        if (collectionType === 'page') {
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

    const draftFileItem = draftList?.find(draft => draft.id === dbItem.id)
    if (draftFileItem) {
      fileItem.status = draftFileItem.status
    }

    if (dbItem.path) {
      fileItem.routePath = dbItem.path as string
    }

    directoryChildren.push(fileItem)
  }

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

function calculateDirectoryStatuses(items: TreeItem[]) {
  for (const item of items) {
    if (item.type === 'directory' && item.children) {
      calculateDirectoryStatuses(item.children)

      for (const child of item.children) {
        if (child.status) {
          item.status = DraftStatus.Updated
          break
        }
      }
    }
  }
}

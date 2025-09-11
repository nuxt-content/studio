import type { DatabaseItem, DraftFileItem, TreeItem } from '../types'
import { withLeadingSlash } from 'ufo'
import { stripNumericPrefix } from './string'

export function buildTree(items: DatabaseItem[], _draft: DraftFileItem[]): TreeItem[] {
  const tree: TreeItem[] = []
  const directoryMap = new Map<string, TreeItem>()

  for (const item of items) {
    // Use stem to determine tree structure
    const stemSegments = item.stem.split('/')
    const directorySegments = stemSegments.slice(0, -1)
    let fileName = stemSegments[stemSegments.length - 1]

    /*****************
    Generate root file
    ******************/
    if (directorySegments.length === 0) {
      fileName = fileName === 'index' ? 'home' : stripNumericPrefix(fileName)
      const filePath = fileName === 'home' ? '/' : withLeadingSlash(stripNumericPrefix(fileName))

      const fileItem: TreeItem = {
        id: item.id,
        name: fileName,
        path: filePath,
        type: 'file',
      }

      // Page type
      if (item.path) {
        fileItem.fileType = 'page'
        fileItem.pagePath = item.path as string
      }
      // Data type
      else {
        fileItem.fileType = 'data'
      }

      tree.push(fileItem)
      continue
    }

    /*****************
    Generate directory
    ******************/
    function dirIdBuilder(index: number) {
      const idSegments = item.id.split('/')
      const stemVsIdGap = idSegments.length - stemSegments.length
      return idSegments.slice(0, index + stemVsIdGap + 1).join('/')
    }

    function dirPathBuilder(index: number) {
      return withLeadingSlash(directorySegments.slice(0, index + 1).map(seg => stripNumericPrefix(seg)).join('/'))
    }

    let directoryChildren = tree
    for (let i = 0; i < directorySegments.length; i++) {
      const dirName = stripNumericPrefix(directorySegments[i])
      const dirId = dirIdBuilder(i)
      const dirPath = dirPathBuilder(i)

      // Only create directory if it doesn't exist
      let directory = directoryMap.get(dirPath)
      if (!directory) {
        directory = {
          id: dirId,
          name: dirName,
          path: dirPath,
          type: 'directory',
          children: [],
        }

        directoryMap.set(dirPath, directory)

        if (!directoryChildren.find(child => child.id === dirId)) {
          directoryChildren.push(directory)
        }
      }

      directoryChildren = directory.children!
    }

    /****************************************
    Generate file in directory (last segment)
    ******************************************/
    const filePath = withLeadingSlash(stemSegments.map(seg => stripNumericPrefix(seg)).join('/'))

    const fileItem: TreeItem = {
      id: item.id,
      name: stripNumericPrefix(fileName),
      path: filePath,
      type: 'file',
    }

    if (item.path) {
      fileItem.fileType = 'page'
      fileItem.pagePath = item.path as string
    }
    else {
      fileItem.fileType = 'data'
    }

    directoryChildren.push(fileItem)
  }

  return tree
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

// function _calculateDirectoryStatuses(items: TreeItem[]) {
//   for (const item of items) {
//     if (item.type === 'directory' && item.children) {
//       // Recursively calculate children first
//       _calculateDirectoryStatuses(item.children)

//       // Calculate this directory's status based on children
//       const childStatuses = item.children
//         .map(child => child.status)
//         .filter(Boolean)

//       if (childStatuses.length > 0) {
//         // Priority: deleted > created > updated
//         if (childStatuses.includes('deleted')) {
//           item.status = 'deleted'
//         }
//         else if (childStatuses.includes('created')) {
//           item.status = 'created'
//         }
//         else if (childStatuses.includes('updated')) {
//           item.status = 'updated'
//         }
//       }
//     }
//   }
// }

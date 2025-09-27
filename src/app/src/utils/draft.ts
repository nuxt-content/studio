import { type BaseItem, type DatabasePageItem, ContentFileExtension, DraftStatus, type DraftItem } from '../types'
import { stringify } from 'minimark/stringify'
import { ROOT_ITEM } from './tree'

export const COLOR_STATUS_MAP: { [key in DraftStatus]?: string } = {
  [DraftStatus.Created]: 'green',
  [DraftStatus.Updated]: 'orange',
  [DraftStatus.Deleted]: 'red',
  [DraftStatus.Renamed]: 'blue',
  [DraftStatus.Opened]: 'gray',
} as const

export const COLOR_UI_STATUS_MAP: { [key in DraftStatus]?: string } = {
  [DraftStatus.Created]: 'success',
  [DraftStatus.Updated]: 'warning',
  [DraftStatus.Deleted]: 'error',
  [DraftStatus.Renamed]: 'info',
  [DraftStatus.Opened]: 'neutral',
} as const

export function getDraftStatus(modified: BaseItem, original: BaseItem | undefined) {
  if (!original) {
    return DraftStatus.Created
  }

  if (original.extension === ContentFileExtension.Markdown) {
    if (!isEqual(original as DatabasePageItem, modified as DatabasePageItem)) {
      return DraftStatus.Updated
    }
  }
  else {
    if (JSON.stringify(original) !== JSON.stringify(modified)) {
      return DraftStatus.Updated
    }
  }

  return DraftStatus.Opened
}

export function findDescendantsFromId(list: DraftItem[], id: string): DraftItem[] {
  if (id === ROOT_ITEM.id) {
    return list
  }

  const descendants: DraftItem[] = []
  for (const item of list) {
    if (item.id === id || item.id.startsWith(id + '/')) {
      descendants.push(item)
    }
  }

  return descendants
}

function isEqual(document1: DatabasePageItem, document2: DatabasePageItem) {
  function removeLastStyle(document: DatabasePageItem) {
    if (document.body?.value[document.body?.value.length - 1]?.[0] === 'style') {
      return { ...document, body: { ...document.body, value: document.body?.value.slice(0, -1) } }
    }
    return document
  }

  const { body: body1, meta: meta1, ...documentData1 } = document1
  const { body: body2, meta: meta2, ...documentData2 } = document2

  // Compare body first
  if (document1.extension === ContentFileExtension.Markdown) {
    if (document1.body?.type === 'minimark') {
      document1 = removeLastStyle(document1)
    }
    if (document2.body?.type === 'minimark') {
      document2 = removeLastStyle(document2)
    }

    if (stringify(body1) !== stringify(body2)) {
      return false
    }
  }
  else {
    // For other file types, we compare the JSON stringified bodies
    if (JSON.stringify(body1) !== JSON.stringify(body2)) {
      return false
    }
  }

  if (JSON.stringify(documentData1) !== JSON.stringify(documentData2)) {
    return false
  }

  const { __hash__: _hash1, ...metaFields1 } = meta1
  const { __hash__: _hash2, ...metaFields2 } = meta2
  if (JSON.stringify(metaFields1) !== JSON.stringify(metaFields2)) {
    return false
  }

  return true
}

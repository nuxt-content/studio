import { type DatabasePageItem, type DraftItem, type BaseItem, ContentFileExtension } from '../types'
import { DraftStatus } from '../types'
import { ROOT_ITEM } from './tree'
import { isEqual } from './database'

export function getUpdatedDraftStatus(modified: BaseItem, original: BaseItem | undefined): DraftStatus {
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

import { type DatabasePageItem, type DraftItem, type BaseItem, ContentFileExtension, TreeRootId } from '../types'
import { DraftStatus } from '../types'
import { isEqual } from './database'
import { studioFlags } from '../composables/useStudio'

export function getDraftStatus(modified?: BaseItem, original?: BaseItem): DraftStatus {
  if (studioFlags.dev) {
    return DraftStatus.Pristine
  }

  if (!modified && !original) {
    throw new Error('Unconsistent state: both modified and original are undefined')
  }

  if (!modified) {
    return DraftStatus.Deleted
  }

  if (!original || original.id !== modified.id) {
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

  return DraftStatus.Pristine
}

export function findDescendantsFromId(list: DraftItem[], id: string): DraftItem[] {
  if ([TreeRootId.Content, TreeRootId.Media].includes(id as TreeRootId)) {
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

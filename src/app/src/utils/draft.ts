import type { DatabaseItem, MediaItem, DatabasePageItem, DraftItem, BaseItem, ContentConflict } from '../types'
import { DraftStatus, ContentFileExtension, TreeRootId } from '../types'
import { isEqual } from './database'
import { studioFlags } from '../composables/useStudio'
import { generateContentFromDocument } from './content'
import { fromBase64ToUTF8 } from '../utils/string'

export async function checkConflict(draftItem: DraftItem<DatabaseItem | MediaItem>): Promise<ContentConflict | undefined> {
  if (draftItem.id.startsWith(TreeRootId.Media)) {
    return
  }

  if (draftItem.status === DraftStatus.Deleted) {
    return
  }

  if (draftItem.status === DraftStatus.Created && draftItem.githubFile) {
    return {
      githubContent: fromBase64ToUTF8(draftItem.githubFile.content!),
      localContent: await generateContentFromDocument(draftItem.modified as DatabaseItem) as string,
    }
  }

  // TODO: No GitHub file found (might have been deleted remotely)
  if (!draftItem.githubFile || !draftItem.githubFile.content) {
    return
  }

  const localContent = await generateContentFromDocument(draftItem.original as DatabaseItem) as string
  const githubContent = fromBase64ToUTF8(draftItem.githubFile.content)

  if (localContent.trim() === githubContent.trim()) {
    return
  }

  return {
    githubContent,
    localContent,
  }
}

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
    const isExactMatch = item.id === id
    // If exact match it means id refers to a file, there is no need to browse the list further
    if (isExactMatch) {
      return [item]
    }

    // Else it means id refers to a directory, we need to browse the list further to find all descendants
    const isDescendant = item.id.startsWith(id + '/')
    if (isDescendant) {
      descendants.push(item)
    }
  }

  return descendants
}

import type { DatabaseItem, MediaItem, DatabasePageItem, DraftItem, BaseItem, ContentConflict, StudioHost } from '../types'
import { DraftStatus, ContentFileExtension } from '../types'
import { isEqual } from './database'
import { studioFlags } from '../composables/useStudio'
import { generateContentFromDocument } from './content'
import { fromBase64ToUTF8 } from '../utils/string'
import { isMediaFile } from './file'

export async function checkConflict(host: StudioHost, draftItem: DraftItem<DatabaseItem | MediaItem>): Promise<ContentConflict | undefined> {
  if (isMediaFile(draftItem.fsPath) || draftItem.fsPath.endsWith('.gitkeep')) {
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

  const githubContent = fromBase64ToUTF8(draftItem.githubFile.content)

  if (await host.document.isEqual(githubContent, draftItem.original! as DatabaseItem)) {
    return
  }

  const localContent = await generateContentFromDocument(draftItem.original as DatabaseItem) as string
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
  else if (typeof original === 'object' && typeof modified === 'object') {
    if (!isEqual(original as unknown as Record<string, unknown>, modified as unknown as Record<string, unknown>)) {
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

export function findDescendantsFromFsPath(list: DraftItem[], fsPath: string): DraftItem[] {
  if (fsPath === '/') {
    return list
  }

  const descendants: DraftItem[] = []
  for (const item of list) {
    const isExactMatch = item.fsPath === fsPath
    // If exact match it means id refers to a file, there is no need to browse the list further
    if (isExactMatch) {
      return [item]
    }

    // Else it means id refers to a directory, we need to browse the list further to find all descendants
    const isDescendant = item.fsPath.startsWith(fsPath + '/')
    if (isDescendant) {
      descendants.push(item)
    }
  }

  return descendants
}

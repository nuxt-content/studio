import type { DatabaseItem, MediaItem, DraftItem, ContentConflict, StudioHost } from '../types'
import { DraftStatus } from '../types'
import { fromBase64ToUTF8 } from '../utils/string'
import { isMediaFile } from './file'

export async function checkConflict(host: StudioHost, draftItem: DraftItem<DatabaseItem | MediaItem>): Promise<ContentConflict | undefined> {
  const generateContentFromDocument = host.document.generate.contentFromDocument
  const isDocumentMatchingContent = host.document.utils.isMatchingContent

  if (isMediaFile(draftItem.fsPath) || draftItem.fsPath.endsWith('.gitkeep')) {
    return
  }

  if (draftItem.status === DraftStatus.Deleted) {
    return
  }

  if (draftItem.status === DraftStatus.Created && draftItem.remoteFile) {
    return {
      remoteContent: draftItem.remoteFile.encoding === 'base64' ? fromBase64ToUTF8(draftItem.remoteFile.content!) : draftItem.remoteFile.content!,
      localContent: await generateContentFromDocument(draftItem.modified as DatabaseItem) as string,
    }
  }

  // TODO: No remote file found (might have been deleted remotely)
  if (!draftItem.remoteFile || !draftItem.remoteFile.content) {
    return
  }

  const remoteContent = fromBase64ToUTF8(draftItem.remoteFile.content)

  if (await isDocumentMatchingContent(remoteContent, draftItem.original! as DatabaseItem)) {
    return
  }

  const localContent = await generateContentFromDocument(draftItem.original as DatabaseItem) as string
  if (localContent.trim() === remoteContent.trim()) {
    return
  }

  return {
    remoteContent,
    localContent,
  }
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

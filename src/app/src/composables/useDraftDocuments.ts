import type { DatabaseItem, DraftItem, StudioHost, RawFile } from '../types'
import { DraftStatus } from '../types/draft'
import type { useGit } from './useGit'
import { generateContentFromDocument } from '../utils/content'
import { getDraftStatus } from '../utils/draft'
import { createSharedComposable } from '@vueuse/core'
import { useHooks } from './useHooks'
import { joinURL } from 'ufo'
import { documentStorage as storage } from '../utils/storage'
import { getFileExtension } from '../utils/file'
import { useDraftBase } from './useDraftBase'

export const useDraftDocuments = createSharedComposable((host: StudioHost, git: ReturnType<typeof useGit>) => {
  const {
    list,
    current,
    get,
    create,
    remove,
    revert,
    revertAll,
    select,
    selectById,
    load,
  } = useDraftBase<DatabaseItem>('document', host, git, storage)

  const hooks = useHooks()

  async function update(id: string, document: DatabaseItem): Promise<DraftItem<DatabaseItem>> {
    const existingItem = list.value.find(item => item.id === id) as DraftItem<DatabaseItem>
    if (!existingItem) {
      throw new Error(`Draft file not found for document ${id}`)
    }

    const oldStatus = existingItem.status
    existingItem.status = getDraftStatus(document, existingItem.original)
    existingItem.modified = document

    await storage.setItem(id, existingItem)

    list.value = list.value.map(item => item.id === id ? existingItem : item)

    // Upsert document in database
    await host.document.upsert(id, existingItem.modified)

    // Trigger hook to warn that draft list has changed
    if (existingItem.status !== oldStatus) {
      await hooks.callHook('studio:draft:document:updated', { caller: 'useDraftDocuments.update' })
    }
    else {
      // Rerender host app
      host.app.requestRerender()
    }

    return existingItem
  }

  async function rename(items: { id: string, newFsPath: string }[]) {
    for (const item of items) {
      const { id, newFsPath } = item

      const existingDraftToRename = list.value.find(draftItem => draftItem.id === id) as DraftItem<DatabaseItem>
      const dbItemToRename: DatabaseItem = await host.document.get(id)
      if (!dbItemToRename) {
        throw new Error(`Database item not found for document ${id}`)
      }

      const modifiedDbItem = existingDraftToRename?.modified || dbItemToRename
      let originalDbItem: DatabaseItem | undefined = dbItemToRename
      if (existingDraftToRename) {
        originalDbItem = existingDraftToRename.original
      }

      const content = await generateContentFromDocument(modifiedDbItem)

      await remove([id], { rerender: false })

      const newDbItem = await host.document.create(newFsPath, content!)

      await create(newDbItem, originalDbItem, { rerender: false })
    }

    await hooks.callHook('studio:draft:document:updated', { caller: 'useDraftDocuments.rename' })
  }

  async function duplicate(id: string): Promise<DraftItem<DatabaseItem>> {
    let currentDbItem = await host.document.get(id)
    if (!currentDbItem) {
      throw new Error(`Database item not found for document ${id}`)
    }

    const currentDraftItem = list.value.find(item => item.id === id)
    if (currentDraftItem) {
      currentDbItem = currentDraftItem.modified as DatabaseItem
    }

    const currentFsPath = currentDraftItem?.fsPath || host.document.getFileSystemPath(id)
    const currentContent = await generateContentFromDocument(currentDbItem) || ''
    const currentName = currentFsPath.split('/').pop()!
    const currentExtension = getFileExtension(currentName)
    const currentNameWithoutExtension = currentName.split('.').slice(0, -1).join('.')

    const newFsPath = `${currentFsPath.split('/').slice(0, -1).join('/')}/${currentNameWithoutExtension}-copy.${currentExtension}`

    const newDbItem = await host.document.create(newFsPath, currentContent)

    return await create(newDbItem)
  }

  async function listAsRawFiles(): Promise<RawFile[]> {
    const files = [] as RawFile[]
    for (const draftItem of list.value) {
      if (draftItem.status === DraftStatus.Deleted) {
        files.push({ path: joinURL('content', draftItem.fsPath), content: null, status: draftItem.status, encoding: 'utf-8' })
        continue
      }

      const content = await generateContentFromDocument(draftItem.modified as DatabaseItem)
      files.push({
        path: joinURL('content', draftItem.fsPath),
        content: content!,
        status: draftItem.status,
        encoding: 'utf-8',
      })
    }

    return files
  }

  return {
    get,
    create,
    update,
    remove,
    revert,
    revertAll,
    rename,
    duplicate,
    list,
    listAsRawFiles,
    load,
    current,
    select,
    selectById,
  }
})

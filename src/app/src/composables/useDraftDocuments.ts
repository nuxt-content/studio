import type { DatabaseItem, DraftItem, StudioHost, RawFile } from '../types'
import { DraftStatus } from '../types/draft'
import type { useGit } from './useGit'
import { createSharedComposable } from '@vueuse/core'
import { useHooks } from './useHooks'
import { joinURL } from 'ufo'
import { documentStorage as storage } from '../utils/storage'
import { getFileExtension } from '../utils/file'
import { useDraftBase } from './useDraftBase'

export const useDraftDocuments = createSharedComposable((host: StudioHost, git: ReturnType<typeof useGit>) => {
  const {
    isLoading,
    list,
    current,
    get,
    create,
    remove,
    revert,
    revertAll,
    selectByFsPath,
    unselect,
    load,
    getStatus,
  } = useDraftBase<DatabaseItem>('document', host, git, storage)

  const hooks = useHooks()
  const hostDb = host.document.db
  const generateContentFromDocument = host.document.generate.contentFromDocument

  async function update(fsPath: string, document: DatabaseItem): Promise<DraftItem<DatabaseItem>> {
    const existingItem = list.value.find(item => item.fsPath === fsPath) as DraftItem<DatabaseItem>
    if (!existingItem) {
      throw new Error(`Draft file not found for document fsPath: ${fsPath}`)
    }

    const oldStatus = existingItem.status
    existingItem.status = getStatus(document, existingItem.original as DatabaseItem)
    existingItem.modified = document

    await storage.setItem(fsPath, existingItem)

    list.value = list.value.map(item => item.fsPath === fsPath ? existingItem : item)

    // Upsert document in database
    await hostDb.upsert(fsPath, existingItem.modified)

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

  async function rename(items: { fsPath: string, newFsPath: string }[]) {
    for (const item of items) {
      const { fsPath, newFsPath } = item

      const existingDraftToRename = list.value.find(draftItem => draftItem.fsPath === fsPath) as DraftItem<DatabaseItem>
      const dbItemToRename = await hostDb.get(fsPath)
      if (!dbItemToRename) {
        throw new Error(`Database item not found for document fsPath: ${fsPath}`)
      }

      const modifiedDbItem = existingDraftToRename?.modified || dbItemToRename
      let originalDbItem: DatabaseItem | undefined = dbItemToRename
      if (existingDraftToRename) {
        originalDbItem = existingDraftToRename.original
      }

      const content = await generateContentFromDocument(modifiedDbItem)

      await remove([fsPath], { rerender: false })

      const newDbItem = await hostDb.create(newFsPath, content!)

      await create(newFsPath, newDbItem, originalDbItem, { rerender: false })
    }

    await hooks.callHook('studio:draft:document:updated', { caller: 'useDraftDocuments.rename' })
  }

  async function duplicate(fsPath: string): Promise<DraftItem<DatabaseItem>> {
    let currentDbItem = await hostDb.get(fsPath)
    if (!currentDbItem) {
      throw new Error(`Database item not found for document fsPath: ${fsPath}`)
    }

    const currentDraftItem = list.value.find(item => item.fsPath === fsPath)
    if (currentDraftItem) {
      currentDbItem = currentDraftItem.modified as DatabaseItem
    }

    const currentFsPath = currentDraftItem?.fsPath || fsPath
    const currentContent = await generateContentFromDocument(currentDbItem) || ''
    const currentName = currentFsPath.split('/').pop()!
    const currentExtension = getFileExtension(currentName)
    const currentNameWithoutExtension = currentName.split('.').slice(0, -1).join('.')

    const newFsPath = `${currentFsPath.split('/').slice(0, -1).join('/')}/${currentNameWithoutExtension}-copy.${currentExtension}`

    const newDbItem = await hostDb.create(newFsPath, currentContent)

    return await create(newFsPath, newDbItem)
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
    isLoading,
    list,
    current,
    get,
    create,
    update,
    remove,
    revert,
    revertAll,
    rename,
    duplicate,
    listAsRawFiles,
    load,
    selectByFsPath,
    unselect,
    getStatus,
  }
})

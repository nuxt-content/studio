import type { Storage } from 'unstorage'
import { joinURL } from 'ufo'
import type { DraftItem, StudioHost, GitFile, DatabaseItem, MediaItem, BaseItem } from '../types'
import { ContentFileExtension } from '../types'
import { DraftStatus } from '../types/draft'
import { checkConflict, findDescendantsFromFsPath } from '../utils/draft'
import type { useGitProvider } from './useGitProvider'
import { useHooks } from './useHooks'
import { ref } from 'vue'
import { useStudioState } from './useStudioState'

export function useDraftBase<T extends DatabaseItem | MediaItem>(
  type: 'media' | 'document',
  host: StudioHost,
  gitProvider: ReturnType<typeof useGitProvider>,
  storage: Storage<DraftItem<T>>,
) {
  const isLoading = ref(false)
  const list = ref<DraftItem<DatabaseItem | MediaItem>[]>([])
  const current = ref<DraftItem<DatabaseItem | MediaItem> | null>(null)

  const remotePathPrefix = type === 'media' ? 'public' : 'content'
  const hostDb = type === 'media' ? host.media : host.document.db
  const hookName = `studio:draft:${type}:updated` as const
  const areDocumentsEqual = host.document.utils.areEqual

  const hooks = useHooks()
  const { devMode } = useStudioState()

  async function get(fsPath: string): Promise<DraftItem<T> | undefined> {
    return list.value.find(item => item.fsPath === fsPath) as DraftItem<T>
  }

  async function create(fsPath: string, item: T, original?: T, { rerender = true }: { rerender?: boolean } = {}): Promise<DraftItem<T>> {
    const existingItem = list.value?.find(draft => draft.fsPath === fsPath)
    if (existingItem) {
      throw new Error(`Draft file already exists for document at ${fsPath}`)
    }

    const remoteFile = await gitProvider.api.fetchFile(joinURL(remotePathPrefix, fsPath), { cached: true }) as GitFile

    const draftItem: DraftItem<T> = {
      fsPath,
      remoteFile,
      status: getStatus(item, original!),
      modified: item,
    }

    if (original) {
      draftItem.original = original
    }

    const conflict = await checkConflict(host, draftItem)
    if (conflict) {
      draftItem.conflict = conflict
    }

    await storage.setItem(fsPath, draftItem)

    list.value.push(draftItem)

    if (rerender) {
      await hooks.callHook(hookName, { caller: 'useDraftBase.create' })
    }

    return draftItem
  }

  async function remove(fsPaths: string[], { rerender = true }: { rerender?: boolean } = {}) {
    for (const fsPath of fsPaths) {
      const existingDraftItem = list.value.find(item => item.fsPath === fsPath) as DraftItem<T> | undefined
      const originalDbItem = await hostDb.get(fsPath) as T

      await storage.removeItem(fsPath)
      await hostDb.delete(fsPath)

      if (!devMode.value) {
        let deleteDraftItem: DraftItem<T> | null = null
        if (existingDraftItem) {
          if (existingDraftItem.status === DraftStatus.Deleted) return

          if (existingDraftItem.status === DraftStatus.Created) {
            list.value = list.value.filter(item => item.fsPath !== fsPath)
          }
          else {
            // TODO: check if remote file has been updated
            const remoteFile = await gitProvider.api.fetchFile(joinURL('content', fsPath), { cached: true }) as GitFile

            deleteDraftItem = {
              fsPath: existingDraftItem.fsPath,
              status: DraftStatus.Deleted,
              original: existingDraftItem.original,
              remoteFile,
            }

            list.value = list.value.map(item => item.fsPath === fsPath ? deleteDraftItem! : item) as DraftItem<T>[]
          }
        }
        else {
        // TODO: check if gh file has been updated
          const remoteFile = await gitProvider.api.fetchFile(joinURL('content', fsPath), { cached: true }) as GitFile

          deleteDraftItem = {
            fsPath,
            status: DraftStatus.Deleted,
            original: originalDbItem,
            remoteFile,
          }

          list.value.push(deleteDraftItem)
        }

        if (deleteDraftItem) {
          await storage.setItem(fsPath, deleteDraftItem)
        }
      }

      if (rerender) {
        await hooks.callHook(hookName, { caller: 'useDraftBase.remove' })
      }
    }
  }

  async function revert(fsPath: string, { rerender = true }: { rerender?: boolean } = {}) {
    const draftItems = findDescendantsFromFsPath(list.value, fsPath)

    for (const draftItem of draftItems) {
      const existingItem = list.value.find(item => item.fsPath === draftItem.fsPath) as DraftItem<T>
      if (!existingItem) {
        return
      }

      if (existingItem.status === DraftStatus.Created) {
        await hostDb.delete(draftItem.fsPath)
        await storage.removeItem(draftItem.fsPath)
        list.value = list.value.filter(item => item.fsPath !== draftItem.fsPath)

        // Renamed draft
        if (existingItem.original) {
          await revert(existingItem.original.fsPath!, { rerender: false })
        }
      }
      else {
        // @ts-expect-error upsert type is wrong, second param should be DatabaseItem | MediaItem
        await hostDb.upsert(draftItem.fsPath, existingItem.original)
        existingItem.modified = existingItem.original
        existingItem.status = getStatus(existingItem.modified as DatabaseItem, existingItem.original as DatabaseItem)
        await storage.setItem(draftItem.fsPath, existingItem)
      }
    }

    if (rerender) {
      await hooks.callHook(hookName, { caller: 'useDraftBase.revert' })
    }
  }

  async function revertAll() {
    const itemsToRevert = [...list.value]

    for (const draftItem of itemsToRevert) {
      await revert(draftItem.fsPath, { rerender: false })
    }

    await hooks.callHook(hookName, { caller: 'useDraftBase.revertAll' })
  }

  async function unselect() {
    current.value = null
  }

  async function selectByFsPath(fsPath: string) {
    isLoading.value = true

    try {
      const existingItem = list.value?.find(item => item.fsPath === fsPath) as DraftItem<T>
      if (existingItem) {
        current.value = existingItem
        return
      }

      const dbItem = await hostDb.get(fsPath) as T
      if (!dbItem) {
        throw new Error(`Cannot select item: no corresponding database entry found for fsPath ${fsPath}`)
      }

      const draftItem = await create(fsPath, dbItem, dbItem)

      current.value = draftItem
    }
    finally {
      isLoading.value = false
    }
  }

  async function load() {
    const storedList = await storage.getKeys().then(async (keys) => {
      return Promise.all(keys.map(async (key) => {
        const item = await storage.getItem(key) as DraftItem
        if (item.status === DraftStatus.Pristine) {
          await storage.removeItem(key)
          return null
        }
        return item
      }))
    })

    list.value = storedList.filter(Boolean) as DraftItem<DatabaseItem>[]

    // Upsert/Delete draft files in database
    await Promise.all(list.value.map(async (draftItem) => {
      if (draftItem.status === DraftStatus.Deleted) {
        await hostDb.delete(draftItem.fsPath)
      }
      else {
        // @ts-expect-error upsert type is wrong, second param should be DatabaseItem | MediaItem
        await hostDb.upsert(draftItem.fsPath, draftItem.modified)
      }
    }))

    await hooks.callHook(hookName, { caller: 'useDraftBase.load', selectItem: false })
  }

  function getStatus(modified: BaseItem, original: BaseItem): DraftStatus {
    if (devMode.value) {
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
      if (!areDocumentsEqual(original as DatabaseItem, modified as DatabaseItem)) {
        return DraftStatus.Updated
      }
    }
    else if (typeof original === 'object' && typeof modified === 'object') {
      if (!areDocumentsEqual(original as DatabaseItem, modified as DatabaseItem)) {
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

  return {
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
    checkConflict,
    getStatus,
  }
}

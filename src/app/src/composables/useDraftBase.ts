import type { Storage } from 'unstorage'
import { joinURL } from 'ufo'
import type { DraftItem, StudioHost, GithubFile, DatabaseItem, MediaItem } from '../types'
import { DraftStatus } from '../types/draft'
import { checkConflict, findDescendantsFromFsPath, getDraftStatus } from '../utils/draft'
import type { useGit } from './useGit'
import { useHooks } from './useHooks'
import { ref } from 'vue'

export function useDraftBase<T extends DatabaseItem | MediaItem>(
  type: 'media' | 'document',
  host: StudioHost,
  git: ReturnType<typeof useGit>,
  storage: Storage<DraftItem<T>>,
) {
  const isLoading = ref(false)
  const list = ref<DraftItem<DatabaseItem | MediaItem>[]>([])
  const current = ref<DraftItem<DatabaseItem | MediaItem> | null>(null)

  const ghPathPrefix = type === 'media' ? 'public' : 'content'
  const hostDb = type === 'media' ? host.media : host.document
  const hookName = `studio:draft:${type}:updated` as const

  const hooks = useHooks()

  async function get(fsPath: string): Promise<DraftItem<T> | undefined> {
    return list.value.find(item => item.fsPath === fsPath) as DraftItem<T>
  }

  async function create(fsPath: string, item: T, original?: T, { rerender = true }: { rerender?: boolean } = {}): Promise<DraftItem<T>> {
    const existingItem = list.value?.find(draft => draft.fsPath === fsPath)
    if (existingItem) {
      throw new Error(`Draft file already exists for document at ${fsPath}`)
    }

    const githubFile = await git.fetchFile(joinURL(ghPathPrefix, fsPath), { cached: true }) as GithubFile

    const draftItem: DraftItem<T> = {
      fsPath,
      githubFile,
      status: getDraftStatus(item, original),
      modified: item,
    }

    if (original) {
      draftItem.original = original
    }

    const conflict = await checkConflict(draftItem)
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

      let deleteDraftItem: DraftItem<T> | null = null
      if (existingDraftItem) {
        if (existingDraftItem.status === DraftStatus.Deleted) return

        if (existingDraftItem.status === DraftStatus.Created) {
          list.value = list.value.filter(item => item.fsPath !== fsPath)
        }
        else {
          deleteDraftItem = {
            fsPath: existingDraftItem.fsPath,
            status: DraftStatus.Deleted,
            original: existingDraftItem.original,
            githubFile: existingDraftItem.githubFile,
          }

          list.value = list.value.map(item => item.fsPath === fsPath ? deleteDraftItem! : item) as DraftItem<T>[]
        }
      }
      else {
      // TODO: check if gh file has been updated
        const githubFile = await git.fetchFile(joinURL('content', fsPath), { cached: true }) as GithubFile

        deleteDraftItem = {
          fsPath,
          status: DraftStatus.Deleted,
          original: originalDbItem,
          githubFile,
        }

        list.value.push(deleteDraftItem)
      }

      if (deleteDraftItem) {
        await storage.setItem(fsPath, deleteDraftItem)
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
          await revert(existingItem.original.fsPath, { rerender: false })
        }
      }
      else {
        // @ts-expect-error upsert type is wrong, second param should be DatabaseItem | MediaItem
        await hostDb.upsert(draftItem.fsPath, existingItem.original)
        existingItem.modified = existingItem.original
        existingItem.status = getDraftStatus(existingItem.modified, existingItem.original)
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
  }
}

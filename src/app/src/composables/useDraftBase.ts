import type { Storage } from 'unstorage'
import { joinURL } from 'ufo'
import type { DraftItem, StudioHost, GithubFile, DatabaseItem, MediaItem } from '../types'
import { DraftStatus } from '../types/draft'
import { findDescendantsFromId, getDraftStatus } from '../utils/draft'
import type { useGit } from './useGit'
import { useHooks } from './useHooks'
import { ref } from 'vue'

export function useDraftBase<T extends DatabaseItem | MediaItem>(
  type: 'media' | 'document',
  host: StudioHost,
  git: ReturnType<typeof useGit>,
  storage: Storage<DraftItem<T>>,
) {
  const list = ref<DraftItem<DatabaseItem | MediaItem>[]>([])
  const current = ref<DraftItem<DatabaseItem | MediaItem> | null>(null)

  const ghPathPrefix = type === 'media' ? 'public' : 'content'
  const hostDb = type === 'media' ? host.media : host.document
  const hookName = `studio:draft:${type}:updated` as const

  const hooks = useHooks()

  async function get(id: string): Promise<DraftItem<T> | undefined> {
    return list.value.find(item => item.id === id) as DraftItem<T>
  }

  async function create(item: T, original?: T, { rerender = true }: { rerender?: boolean } = {}): Promise<DraftItem<T>> {
    const existingItem = list.value?.find(draft => draft.id === item.id)
    if (existingItem) {
      throw new Error(`Draft file already exists for document ${item.id}`)
    }

    const fsPath = hostDb.getFileSystemPath(item.id)
    const githubFile = await git.fetchFile(joinURL(ghPathPrefix, fsPath), { cached: true }) as GithubFile

    const draftItem: DraftItem<T> = {
      id: item.id,
      fsPath,
      githubFile,
      status: getDraftStatus(item, original),
      modified: item,
    }

    if (original) {
      draftItem.original = original
    }

    await storage.setItem(item.id, draftItem)

    list.value.push(draftItem)

    if (rerender) {
      await hooks.callHook(hookName, { caller: 'useDraftBase.create' })
    }

    return draftItem
  }

  async function remove(ids: string[], { rerender = true }: { rerender?: boolean } = {}) {
    for (const id of ids) {
      const existingDraftItem = list.value.find(item => item.id === id) as DraftItem<T> | undefined
      const fsPath = hostDb.getFileSystemPath(id)
      const originalDbItem = await hostDb.get(id) as T

      await storage.removeItem(id)
      await hostDb.delete(id)

      let deleteDraftItem: DraftItem<T> | null = null
      if (existingDraftItem) {
        if (existingDraftItem.status === DraftStatus.Deleted) return

        if (existingDraftItem.status === DraftStatus.Created) {
          list.value = list.value.filter(item => item.id !== id)
        }
        else {
          deleteDraftItem = {
            id,
            fsPath: existingDraftItem.fsPath,
            status: DraftStatus.Deleted,
            original: existingDraftItem.original,
            githubFile: existingDraftItem.githubFile,
          }

          list.value = list.value.map(item => item.id === id ? deleteDraftItem! : item) as DraftItem<T>[]
        }
      }
      else {
      // TODO: check if gh file has been updated
        const githubFile = await git.fetchFile(joinURL('content', fsPath), { cached: true }) as GithubFile

        deleteDraftItem = {
          id,
          fsPath,
          status: DraftStatus.Deleted,
          original: originalDbItem,
          githubFile,
        }

        list.value.push(deleteDraftItem)
      }

      if (deleteDraftItem) {
        await storage.setItem(id, deleteDraftItem)
      }

      if (rerender) {
        await hooks.callHook(hookName, { caller: 'useDraftBase.remove' })
      }
    }
  }

  async function revert(id: string, { rerender = true }: { rerender?: boolean } = {}) {
    const draftItems = findDescendantsFromId(list.value, id)

    for (const draftItem of draftItems) {
      const existingItem = list.value.find(item => item.id === draftItem.id) as DraftItem<T>
      if (!existingItem) {
        return
      }

      if (existingItem.status === DraftStatus.Created) {
        await hostDb.delete(draftItem.id)
        await storage.removeItem(draftItem.id)
        list.value = list.value.filter(item => item.id !== draftItem.id)

        // Renamed draft
        if (existingItem.original) {
          await revert(existingItem.original.id, { rerender: false })
        }
      }
      else {
        // @ts-expect-error upsert type is wrong, second param should be DatabaseItem | MediaItem
        await hostDb.upsert(draftItem.id, existingItem.original)
        existingItem.modified = existingItem.original
        existingItem.status = getDraftStatus(existingItem.modified, existingItem.original)
        await storage.setItem(draftItem.id, existingItem)
      }
    }

    if (rerender) {
      await hooks.callHook(hookName, { caller: 'useDraftBase.revert' })
    }
  }

  async function revertAll() {
    const itemsToRevert = [...list.value]

    for (const draftItem of itemsToRevert) {
      await revert(draftItem.id, { rerender: false })
    }

    await hooks.callHook(hookName, { caller: 'useDraftBase.revertAll' })
  }

  function select(draftItem: DraftItem<T> | null) {
    current.value = draftItem
  }

  async function selectById(id: string) {
    const existingItem = list.value?.find(item => item.id === id) as DraftItem<T>
    if (existingItem) {
      select(existingItem)
      return
    }

    const dbItem = await hostDb.get(id) as T
    if (!dbItem) {
      throw new Error(`Cannot select item: no corresponding database entry found for id ${id}`)
    }

    const draftItem = await create(dbItem, dbItem)
    select(draftItem)
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
        await hostDb.delete(draftItem.id)
      }
      else {
        // @ts-expect-error upsert type is wrong, second param should be DatabaseItem | MediaItem
        await hostDb.upsert(draftItem.id, draftItem.modified)
      }
    }))

    await hooks.callHook(hookName, { caller: 'useDraftBase.load' })
  }

  return {
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
  }
}

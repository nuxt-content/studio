import { ref } from 'vue'
import type { StorageValue, Storage } from 'unstorage'
import type { DatabaseItem, DraftFileItem, StudioHost, GithubFile, DatabasePageItem } from '../types'
import { DraftStatus } from '../types/draft'
import type { useGit } from './useGit'
import { generateContentFromDocument } from '../utils/content'
import { getDraftStatus } from '../utils/draft'
import { createSharedComposable } from '@vueuse/core'
import { useHooks } from './useHooks'

export const useDraftFiles = createSharedComposable((host: StudioHost, git: ReturnType<typeof useGit>, storage: Storage<StorageValue>) => {
  const list = ref<DraftFileItem[]>([])
  const current = ref<DraftFileItem | null>(null)

  const hooks = useHooks()

  async function get(id: string, { generateContent = false }: { generateContent?: boolean } = {}) {
    const item = await storage.getItem(id) as DraftFileItem
    if (generateContent) {
      return {
        ...item,
        content: await generateContentFromDocument(item.document! as DatabasePageItem) || '',
      }
    }
    return item
  }

  // Update and create draft file with exsiting document in database
  async function upsert(id: string, document: DatabaseItem) {
    id = id.replace(/:/g, '/')
    let oldStatus: DraftStatus | undefined
    let item = await storage.getItem(id) as DraftFileItem
    if (!item) {
      const fsPath = host.document.getFileSystemPath(id)

      const originalGithubFile = await git.fetchFile(fsPath, { cached: true }) as GithubFile
      const originalDatabaseItem = await host.document.get(id)

      item = {
        id,
        fsPath,
        originalDatabaseItem,
        originalGithubFile,
        status: originalGithubFile || originalDatabaseItem ? DraftStatus.Opened : DraftStatus.Created,
        document,
      }
    }
    else {
      oldStatus = item.status
      item.document = document
    }

    // TODO: fix double call on open document
    item.status = getDraftStatus(document, item.originalDatabaseItem)

    await storage.setItem(id, item)

    const existingItem = list.value.find(item => item.id == id)
    if (existingItem) {
      existingItem.document = document
      existingItem.status = item.status
    }
    else {
      list.value.push(item)
    }

    await host.document.upsert(id, item.document!)
    host.app.requestRerender()

    if (oldStatus !== item.status) {
      await hooks.callHook('studio:draft:updated')
    }

    return item
  }

  async function remove(id: string) {
    const item = await storage.getItem(id) as DraftFileItem
    const fsPath = host.document.getFileSystemPath(id)

    if (item) {
      if (item.status === DraftStatus.Deleted) return

      await storage.removeItem(id)
      await host.document.delete(id)

      if (item.originalDatabaseItem) {
        const deleteDraft: DraftFileItem = {
          id,
          fsPath: item.fsPath,
          status: DraftStatus.Deleted,
          originalDatabaseItem: item.originalDatabaseItem,
          originalGithubFile: item.originalGithubFile,
        }

        await storage.setItem(id, deleteDraft)
        await host.document.upsert(id, item.originalDatabaseItem!)
      }
    }
    else {
      // Fetch github file before creating draft to detect non deployed changes
      const originalGithubFile = await git.fetchFile(fsPath, { cached: true }) as GithubFile
      const originalDatabaseItem = await host.document.get(id)

      const deleteItem: DraftFileItem = {
        id,
        fsPath,
        status: DraftStatus.Deleted,
        originalDatabaseItem,
        originalGithubFile,
      }

      await storage.setItem(id, deleteItem)

      await host.document.delete(id)
    }

    list.value = list.value.filter(item => item.id !== id)
    host.app.requestRerender()
  }

  async function revert(id: string) {
    const item = await storage.getItem(id) as DraftFileItem
    if (!item) return

    await storage.removeItem(id)

    list.value = list.value.filter(item => item.id !== id)

    if (item.originalDatabaseItem) {
      await host.document.upsert(id, item.originalDatabaseItem)
    }

    if (item.status === DraftStatus.Created) {
      await host.document.delete(id)
    }
    host.app.requestRerender()
  }

  async function revertAll() {
    await storage.clear()
    for (const item of list.value) {
      if (item.originalDatabaseItem) {
        await host.document.upsert(item.id, item.originalDatabaseItem)
      }
      else if (item.status === DraftStatus.Created) {
        await host.document.delete(item.id)
      }
    }
    list.value = []
    host.app.requestRerender()
  }

  async function load() {
    const storedList = await storage.getKeys().then(async (keys) => {
      return Promise.all(keys.map(async (key) => {
        const item = await storage.getItem(key) as DraftFileItem
        if (item.status === DraftStatus.Opened) {
          await storage.removeItem(key)
          return null
        }
        return item
      }))
    })

    list.value = storedList.filter(Boolean) as DraftFileItem[]

    // Upsert/Delete draft files in database
    await Promise.all(list.value.map(async (draftItem) => {
      if (draftItem.status === DraftStatus.Deleted) {
        await host.document.delete(draftItem.id)
      }
      else {
        await host.document.upsert(draftItem.id, draftItem.document!)
      }
    }))

    host.app.requestRerender()

    await hooks.callHook('studio:draft:updated')
  }

  function select(draftItem: DraftFileItem | null) {
    current.value = draftItem
  }

  return {
    get,
    upsert,
    remove,
    revert,
    revertAll,
    list,
    load,
    current,
    select,
  }
})

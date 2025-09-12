import { ref } from 'vue'
import type { StorageValue, Storage } from 'unstorage'
import type { DatabaseItem, DraftFileItem, StudioHost, GithubFile } from '../types'
import { DraftStatus } from '../types/draft'
import type { useGit } from './useGit'
import { generateMarkdown } from '../utils/content'
import { getDraftStatus } from '../utils/draft'

export function useDraftFiles(host: StudioHost, git: ReturnType<typeof useGit>, storage: Storage<StorageValue>) {
  const list = ref<DraftFileItem[]>([])
  const current = ref<DraftFileItem | null>(null)

  async function get(id: string, { generateContent = false }: { generateContent?: boolean } = {}) {
    const item = await storage.getItem(id) as DraftFileItem
    if (generateContent) {
      return {
        ...item,
        content: await generateMarkdown(item.document!) || '',
      }
    }
    return item
  }

  async function upsert(id: string, document: DatabaseItem) {
    id = id.replace(/:/g, '/')
    let item = await storage.getItem(id) as DraftFileItem
    if (!item) {
      const path = host.document.getFileSystemPath(id)

      const originalGithubFile = await git.fetchFile(path, { cached: true }) as GithubFile
      const originalDatabaseItem = await host.document.get(id)

      item = {
        id,
        path,
        originalDatabaseItem,
        originalGithubFile,
        status: originalGithubFile || originalDatabaseItem ? DraftStatus.Opened : DraftStatus.Created,
        document,
      }
    }
    else {
      item.document = document
    }

    // TODO: fix double call on open document
    item.status = getDraftStatus(document, item.originalDatabaseItem)

    console.log('status upserted', item.status)

    await storage.setItem(id, item)

    const existingItem = list.value.find(item => item.id == id)
    if (existingItem) {
      existingItem.document = document
    }
    else {
      list.value.push(item)
    }

    await host.document.upsert(id, item.document!)
    host.requestRerender()

    return item
  }

  async function remove(id: string) {
    const item = await storage.getItem(id) as DraftFileItem
    const path = host.document.getFileSystemPath(id)

    if (item) {
      if (item.status === DraftStatus.Deleted) return

      await storage.removeItem(id)
      await host.document.delete(id)

      if (item.originalDatabaseItem) {
        const deleteDraft: DraftFileItem = {
          id,
          path: item.path,
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
      const originalGithubFile = await git.fetchFile(path, { cached: true }) as GithubFile
      const originalDatabaseItem = await host.document.get(id)

      const deleteItem: DraftFileItem = {
        id,
        path,
        status: DraftStatus.Deleted,
        originalDatabaseItem,
        originalGithubFile,
      }

      await storage.setItem(id, deleteItem)

      await host.document.delete(id)
    }

    list.value = list.value.filter(item => item.id !== id)
    host.requestRerender()
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
    host.requestRerender()
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
    host.requestRerender()
  }

  async function load() {
    const storedList = await storage.getKeys().then(async (keys) => {
      return Promise.all(keys.map(async (key) => {
        const item = await storage.getItem(key) as DraftFileItem
        console.log('item', item)
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

    host.requestRerender()
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
}

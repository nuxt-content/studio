import { ref } from 'vue'
import type { StorageValue, Storage } from 'unstorage'
import type { DatabaseItem, DraftFileItem, StudioHost } from '../types'
import type { useGit } from './useGit'
import { generateMarkdown } from '../utils/content'

export function useDraftFiles(host: StudioHost, git: ReturnType<typeof useGit>, storage: Storage<StorageValue>) {
  const draftFiles = ref<DraftFileItem[]>([])

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

      // Fetch github file before creating draft to detect non deployed changes before publishing
      const originalGithubFile = await git.fetchFile(path, { cached: true })
      const originalDatabaseItem = await host.document.get(id)

      item = {
        id,
        path,
        originalDatabaseItem,
        originalGithubFile,
        status: originalGithubFile || originalDatabaseItem ? 'updated' : 'created',
        document,
      }
    }
    else {
      item.document = document
    }

    await storage.setItem(id, item)

    const existingItem = draftFiles.value.find(item => item.id == id)
    if (existingItem) {
      existingItem.document = document
    }
    else {
      draftFiles.value.push(item)
    }

    await host.document.upsert(id, item.document!)
    host.requestRerender()
  }

  async function remove(id: string) {
    const item = await storage.getItem(id) as DraftFileItem
    const path = host.document.getFileSystemPath(id)

    if (item) {
      if (item.status === 'deleted') return

      await storage.removeItem(id)
      await host.document.delete(id)

      if (item.originalDatabaseItem) {
        const deleteDraft: DraftFileItem = {
          id,
          path: item.path,
          status: 'deleted',
          originalDatabaseItem: item.originalDatabaseItem,
          originalGithubFile: item.originalGithubFile,
        }

        await storage.setItem(id, deleteDraft)
        await host.document.upsert(id, item.originalDatabaseItem!)
      }
    }
    else {
      // Fetch github file before creating draft to detect non deployed changes
      const originalGithubFile = await git.fetchFile(path, { cached: true })
      const originalDatabaseItem = await host.document.get(id)

      const deleteItem: DraftFileItem = {
        id,
        path,
        status: 'deleted',
        originalDatabaseItem,
        originalGithubFile,
      }

      await storage.setItem(id, deleteItem)

      await host.document.delete(id)
    }

    draftFiles.value = draftFiles.value.filter(item => item.id !== id)
    host.requestRerender()
  }

  async function revert(id: string) {
    const item = await storage.getItem(id) as DraftFileItem
    if (!item) return

    await storage.removeItem(id)

    draftFiles.value = draftFiles.value.filter(item => item.id !== id)

    if (item.originalDatabaseItem) {
      await host.document.upsert(id, item.originalDatabaseItem)
    }

    if (item.status === 'created') {
      await host.document.delete(id)
    }
    host.requestRerender()
  }

  async function revertAll() {
    await storage.clear()
    for (const item of draftFiles.value) {
      if (item.originalDatabaseItem) {
        await host.document.upsert(item.id, item.originalDatabaseItem)
      }
      else if (item.status === 'created') {
        await host.document.delete(item.id)
      }
    }
    draftFiles.value = []
    host.requestRerender()
  }

  async function load() {
    const list = await storage.getKeys().then((keys) => {
      return Promise.all(keys.map(key => storage.getItem(key) as unknown as DraftFileItem))
    })

    draftFiles.value = list

    // Upsert/Delete draft files in database
    await Promise.all(draftFiles.value.map(async (draftFile) => {
      if (draftFile.status === 'deleted') {
        await host.document.delete(draftFile.id)
      }
      else {
        await host.document.upsert(draftFile.id, draftFile.document!)
      }
    }))

    host.requestRerender()
  }

  return {
    get,
    upsert,
    remove,
    revert,
    revertAll,
    list: draftFiles,
    load,
  }
}

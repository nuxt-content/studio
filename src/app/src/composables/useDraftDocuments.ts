import { createStorage } from 'unstorage'
import indexedDbDriver from 'unstorage/drivers/indexedb'
import { ref } from 'vue'
import type { DatabaseItem, DraftItem, StudioHost, GithubFile, DatabasePageItem } from '../types'
import { DraftStatus } from '../types/draft'
import type { useGit } from './useGit'
import { generateContentFromDocument } from '../utils/content'
import { getDraftStatus } from '../utils/draft'
import { createSharedComposable } from '@vueuse/core'
import { useHooks } from './useHooks'

const storage = createStorage({
  driver: indexedDbDriver({
    storeName: 'nuxt-content-studio-documents',
  }),
})

export const useDraftDocuments = createSharedComposable((host: StudioHost, git: ReturnType<typeof useGit>) => {
  const list = ref<DraftItem<DatabaseItem>[]>([])
  const current = ref<DraftItem<DatabaseItem> | null>(null)

  const hooks = useHooks()

  async function get(id: string, { generateContent = false }: { generateContent?: boolean } = {}) {
    const item = list.value.find(item => item.id === id)
    if (item && generateContent) {
      return {
        ...item,
        content: await generateContentFromDocument(item!.modified as DatabasePageItem) || '',
      }
    }
    return item
  }

  async function create(document: DatabaseItem, status: DraftStatus = DraftStatus.Created) {
    const existingItem = list.value.find(item => item.id === document.id)
    if (existingItem) {
      throw new Error(`Draft file already exists for document ${document.id}`)
    }

    const fsPath = host.document.getFileSystemPath(document.id)
    const githubFile = await git.fetchFile(fsPath, { cached: true }) as GithubFile

    const item: DraftItem<DatabaseItem> = {
      id: document.id,
      fsPath,
      original: document,
      githubFile,
      status,
      modified: document,
    }

    await storage.setItem(document.id, item)

    list.value.push(item)

    await hooks.callHook('studio:draft:updated')

    return item
  }

  async function update(id: string, document: DatabaseItem) {
    const existingItem = list.value.find(item => item.id === id)
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

    // Rerender host app
    host.app.requestRerender()

    // Trigger hook to warn that draft list has changed
    if (existingItem.status !== oldStatus) {
      await hooks.callHook('studio:draft:updated')
    }

    return existingItem
  }

  async function remove(id: string) {
    const item = await storage.getItem(id) as DraftItem<DatabaseItem>
    const fsPath = host.document.getFileSystemPath(id)

    if (item) {
      if (item.status === DraftStatus.Deleted) return

      await storage.removeItem(id)
      await host.document.delete(id)

      if (item.original) {
        const deleteDraft: DraftItem<DatabaseItem> = {
          id,
          fsPath: item.fsPath,
          status: DraftStatus.Deleted,
          original: item.original,
          githubFile: item.githubFile,
        }

        await storage.setItem(id, deleteDraft)
        await host.document.upsert(id, item.original!)
      }
    }
    else {
      // Fetch github file before creating draft to detect non deployed changes
      const githubFile = await git.fetchFile(fsPath, { cached: true }) as GithubFile
      const original = await host.document.get(id)

      const deleteItem: DraftItem = {
        id,
        fsPath,
        status: DraftStatus.Deleted,
        original,
        githubFile,
      }

      await storage.setItem(id, deleteItem)

      await host.document.delete(id)
    }

    list.value = list.value.filter(item => item.id !== id)
    host.app.requestRerender()
  }

  async function revert(id: string) {
    const existingItem = list.value.find(item => item.id === id)
    if (!existingItem) {
      return
    }

    if (existingItem.status === DraftStatus.Created) {
      await host.document.delete(id)
      await storage.removeItem(id)
      list.value = list.value.filter(item => item.id !== id)
    }
    else {
      await host.document.upsert(id, existingItem.original!)
      existingItem.status = DraftStatus.Opened
      existingItem.modified = existingItem.original
      await storage.setItem(id, existingItem)
    }

    await hooks.callHook('studio:draft:updated')

    host.app.requestRerender()
  }

  async function revertAll() {
    await storage.clear()
    for (const item of list.value) {
      if (item.original) {
        await host.document.upsert(item.id, item.original)
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
        const item = await storage.getItem(key) as DraftItem
        if (item.status === DraftStatus.Opened) {
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
        await host.document.delete(draftItem.id)
      }
      else {
        await host.document.upsert(draftItem.id, draftItem.modified!)
      }
    }))

    host.app.requestRerender()

    await hooks.callHook('studio:draft:updated')
  }

  function select(draftItem: DraftItem<DatabaseItem> | null) {
    current.value = draftItem
  }

  async function selectById(id: string) {
    const existingItem = list.value.find(item => item.id === id)
    if (existingItem) {
      select(existingItem)
      return
    }

    const dbItem = await host.document.get(id)
    if (!dbItem) {
      throw new Error(`Cannot select item: no corresponding database entry found for id ${id}`)
    }

    const draftItem = await create(dbItem, DraftStatus.Opened)
    select(draftItem)
  }

  return {
    get,
    create,
    update,
    remove,
    revert,
    revertAll,
    list,
    load,
    current,
    select,
    selectById,
  }
})

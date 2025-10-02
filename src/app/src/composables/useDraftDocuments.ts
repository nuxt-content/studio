import { createStorage } from 'unstorage'
import indexedDbDriver from 'unstorage/drivers/indexedb'
import { ref } from 'vue'
import type { DatabaseItem, DraftItem, StudioHost, GithubFile, RawFile } from '../types'
import { DraftStatus } from '../types/draft'
import type { useGit } from './useGit'
import { generateContentFromDocument } from '../utils/content'
import { findDescendantsFromId, getDraftStatus } from '../utils/draft'
import { createSharedComposable } from '@vueuse/core'
import { useHooks } from './useHooks'
import { stripNumericPrefix } from '../utils/string'
import { joinURL } from 'ufo'

const storage = createStorage({
  driver: indexedDbDriver({
    dbName: 'content-studio-document',
    storeName: 'drafts',
  }),
})

export const useDraftDocuments = createSharedComposable((host: StudioHost, git: ReturnType<typeof useGit>) => {
  const list = ref<DraftItem<DatabaseItem>[]>([])
  const current = ref<DraftItem<DatabaseItem> | null>(null)

  const hooks = useHooks()

  async function get(id: string): Promise<DraftItem<DatabaseItem> | undefined> {
    return list.value.find(item => item.id === id)
    // if (item && generateContent) {
    //   return {
    //     ...item,
    //     content: await generateContentFromDocument(item!.modified as DatabasePageItem) || '',
    //   }
    // }
    // return item
  }

  async function create(document: DatabaseItem, original?: DatabaseItem) {
    const existingItem = list.value.find(item => item.id === document.id)
    if (existingItem) {
      throw new Error(`Draft file already exists for document ${document.id}`)
    }

    const fsPath = host.document.getFileSystemPath(document.id)
    const githubFile = await git.fetchFile(joinURL('content', fsPath), { cached: true }) as GithubFile

    const item: DraftItem<DatabaseItem> = {
      id: document.id,
      fsPath,
      githubFile,
      status: getDraftStatus(document, original),
      original,
      modified: document,
    }

    await storage.setItem(document.id, item)

    list.value.push(item)

    await hooks.callHook('studio:draft:document:updated')
    // Rerender host app
    host.app.requestRerender()

    return item
  }

  async function update(id: string, document: DatabaseItem): Promise<DraftItem<DatabaseItem>> {
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
      await hooks.callHook('studio:draft:document:updated')
    }

    return existingItem
  }

  async function remove(ids: string[]) {
    for (const id of ids) {
      const existingDraftItem = list.value.find(item => item.id === id)
      const fsPath = host.document.getFileSystemPath(id)
      const originalDbItem = await host.document.get(id)

      await storage.removeItem(id)
      await host.document.delete(id)

      let deleteDraftItem: DraftItem<DatabaseItem> | null = null
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

          list.value = list.value.map(item => item.id === id ? deleteDraftItem! : item)
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

      host.app.requestRerender()

      await hooks.callHook('studio:draft:document:updated')
    }
  }

  async function revert(id: string) {
    const draftItems = findDescendantsFromId(list.value, id)

    for (const draftItem of draftItems) {
      const existingItem = list.value.find(item => item.id === draftItem.id)
      if (!existingItem) {
        return
      }

      if (existingItem.status === DraftStatus.Created) {
        await host.document.delete(draftItem.id)
        await storage.removeItem(draftItem.id)
        list.value = list.value.filter(item => item.id !== draftItem.id)
      }
      else {
        await host.document.upsert(draftItem.id, existingItem.original!)
        existingItem.status = getDraftStatus(existingItem.original!, existingItem.original)
        existingItem.modified = existingItem.original
        await storage.setItem(draftItem.id, existingItem)
      }
    }

    await hooks.callHook('studio:draft:document:updated')

    host.app.requestRerender()
  }

  async function rename(id: string, newFsPath: string) {
    const currentDbItem: DatabaseItem = await host.document.get(id)
    if (!currentDbItem) {
      throw new Error(`Database item not found for document ${id}`)
    }

    const nameWithoutExtension = newFsPath.split('/').pop()!.split('.').slice(0, -1).join('.')
    const newRoutePath = `${currentDbItem.path!.split('/').slice(0, -1).join('/')}/${nameWithoutExtension}`
    const content = await generateContentFromDocument(currentDbItem)

    // Delete renamed draft item
    await remove([id])

    // Create new draft item
    const newDbItem = await host.document.create(newFsPath, newRoutePath, content!)
    return await create(newDbItem, currentDbItem)
  }

  async function duplicate(id: string): Promise<DraftItem<DatabaseItem>> {
    let currentDbItem = await host.document.get(id)
    if (!currentDbItem) {
      throw new Error(`Database item not found for document ${id}`)
    }

    const currentDraftItem = list.value.find(item => item.id === id)
    if (currentDraftItem) {
      currentDbItem = currentDraftItem.modified!
    }

    const currentFsPath = currentDraftItem?.fsPath || host.document.getFileSystemPath(id)
    const currentRoutePath = currentDbItem.path!
    const currentContent = await generateContentFromDocument(currentDbItem) || ''
    const currentName = currentFsPath.split('/').pop()!
    const currentExtension = currentName.split('.').pop()!
    const currentNameWithoutExtension = currentName.split('.').slice(0, -1).join('.')

    const newFsPath = `${currentFsPath.split('/').slice(0, -1).join('/')}/${currentNameWithoutExtension}-copy.${currentExtension}`
    const newRoutePath = `${currentRoutePath.split('/').slice(0, -1).join('/')}/${stripNumericPrefix(currentNameWithoutExtension)}-copy`

    const newDbItem = await host.document.create(newFsPath, newRoutePath, currentContent)

    return await create(newDbItem)
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
        await host.document.delete(draftItem.id)
      }
      else {
        await host.document.upsert(draftItem.id, draftItem.modified!)
      }
    }))

    host.app.requestRerender()

    await hooks.callHook('studio:draft:document:updated')
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

    const draftItem = await create(dbItem, dbItem)

    select(draftItem)
  }

  async function generateRawFiles(): Promise<RawFile[]> {
    const files = [] as RawFile[]
    for (const draftItem of list.value) {
      if (draftItem.status === DraftStatus.Deleted) {
        files.push({ path: joinURL('content', draftItem.fsPath), content: null, status: draftItem.status, encoding: 'utf-8' })
        continue
      }

      const content = await generateContentFromDocument(draftItem.modified!)
      files.push({ path: joinURL('content', draftItem.fsPath), content: content!, status: draftItem.status, encoding: 'utf-8' })
    }

    return files
  }

  return {
    get,
    create,
    update,
    remove,
    revert,
    rename,
    duplicate,
    list,
    load,
    current,
    select,
    selectById,
    generateRawFiles,
  }
})

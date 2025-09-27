import { ref } from 'vue'
import { createStorage } from 'unstorage'
import indexedDbDriver from 'unstorage/drivers/indexedb'
import { joinURL, withLeadingSlash } from 'ufo'
import type { DraftItem, StudioHost, GithubFile, MediaItem } from '../types'
import { DraftStatus } from '../types/draft'
import type { useGit } from './useGit'
import { getDraftStatus } from '../utils/draft'
import { createSharedComposable } from '@vueuse/core'
import { useHooks } from './useHooks'

const storage = createStorage({
  driver: indexedDbDriver({
    dbName: 'nuxt-content-studio-media',
    storeName: 'drafts',
  }),
})

export const useDraftMedias = createSharedComposable((host: StudioHost, git: ReturnType<typeof useGit>) => {
  const list = ref<DraftItem[]>([])
  const current = ref<DraftItem | null>(null)

  const hooks = useHooks()

  async function get(id: string) {
    const item = list.value.find(item => item.id === id)
    return item
  }

  async function create(media: MediaItem, status: DraftStatus = DraftStatus.Created) {
    const existingItem = list.value.find(item => item.id === media.id)
    if (existingItem) {
      throw new Error(`Draft file already exists for document ${media.id}`)
    }

    const fsPath = host.media.getFileSystemPath(media.id)
    const githubFile = await git.fetchFile(fsPath, { cached: true }) as GithubFile

    const item: DraftItem = {
      id: media.id,
      fsPath,
      original: media,
      githubFile,
      status,
      modified: media,
    }

    await storage.setItem(media.id, item)

    list.value.push(item)

    await hooks.callHook('studio:draft:media:updated')

    return item
  }

  async function update(id: string, media: MediaItem) {
    const existingItem = list.value.find(item => item.id === id)
    if (!existingItem) {
      throw new Error(`Draft file not found for document ${id}`)
    }

    const oldStatus = existingItem.status
    existingItem.status = getDraftStatus(media, existingItem.original)
    existingItem.modified = media

    await storage.setItem(id, existingItem)

    list.value = list.value.map(item => item.id === id ? existingItem : item)

    // Upsert document in database
    await host.media.upsert(id, existingItem.modified!)

    // Rerender host app
    host.app.requestRerender()

    // Trigger hook to warn that draft list has changed
    if (existingItem.status !== oldStatus) {
      await hooks.callHook('studio:draft:media:updated')
    }

    return existingItem
  }

  async function remove(ids: string[]) {
    for (const id of ids) {
      const item = await storage.getItem(id) as DraftItem
      const fsPath = host.media.getFileSystemPath(id)

      if (item) {
        if (item.status === DraftStatus.Deleted) return

        await storage.removeItem(id)
        await host.media.delete(id)
      }
      else {
      // Fetch github file before creating draft to detect non deployed changes
        const githubFile = await git.fetchFile(fsPath, { cached: true }) as GithubFile
        const original = await host.media.get(id)

        const deleteItem: DraftItem = {
          id,
          fsPath,
          status: DraftStatus.Deleted,
          original,
          githubFile,
        }

        await storage.setItem(id, deleteItem)

        await host.media.delete(id)
      }

      list.value = list.value.filter(item => item.id !== id)
      host.app.requestRerender()
    }
  }

  async function revert(id: string) {
    const existingItem = list.value.find(item => item.id === id)
    if (!existingItem) {
      return
    }

    if (existingItem.status === DraftStatus.Created) {
      await host.media.delete(id)
      await storage.removeItem(id)
      list.value = list.value.filter(item => item.id !== id)
    }
    else {
      await host.media.upsert(id, existingItem.original!)
      existingItem.status = DraftStatus.Opened
      existingItem.modified = existingItem.original
      await storage.setItem(id, existingItem)
    }

    await hooks.callHook('studio:draft:media:updated')

    host.app.requestRerender()
  }

  async function revertAll() {
    await storage.clear()
    for (const item of list.value) {
      if (item.original) {
        await host.media.upsert(item.id, item.original)
      }
      else if (item.status === DraftStatus.Created) {
        await host.media.delete(item.id)
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

    list.value = storedList.filter(Boolean) as DraftItem[]

    // Upsert/Delete draft files in database
    await Promise.all(list.value.map(async (draftItem) => {
      if (draftItem.status === DraftStatus.Deleted) {
        await host.media.delete(draftItem.id)
      }
      else {
        await host.media.upsert(draftItem.id, draftItem.modified!)
      }
    }))

    host.app.requestRerender()

    await hooks.callHook('studio:draft:media:updated')
  }

  function select(draftItem: DraftItem | null) {
    current.value = draftItem
  }

  async function selectById(id: string) {
    const existingItem = list.value.find(item => item.id === id)
    if (existingItem) {
      select(existingItem)
      return
    }

    const dbItem = await host.media.get(id)
    if (!dbItem) {
      throw new Error(`Cannot select item: no corresponding database entry found for id ${id}`)
    }

    const draftItem = await create(dbItem, DraftStatus.Opened)
    select(draftItem)
  }

  async function upload(directory: string, file: File) {
    const draftItem = await fileToDraftItem(directory, file)
    host.media.upsert(draftItem.id, draftItem.modified!)
    await create(draftItem.modified!)
  }

  async function fileToDraftItem(directory: string, file: File): Promise<DraftItem<MediaItem>> {
    const rawData = await fileToDataUrl(file)
    const fsPath = directory && directory !== '/' ? joinURL(directory, file.name) : file.name

    return {
      id: `public-assets/${fsPath}`,
      fsPath,
      githubFile: undefined,
      status: DraftStatus.Created,
      modified: {
        id: `public-assets/${fsPath}`,
        fsPath,
        extension: fsPath.split('.').pop()!,
        stem: fsPath.split('.').join('.'),
        path: withLeadingSlash(fsPath),
        preview: await resizedataURL(rawData, 128, 128),
        raw: rawData,
      },
    }
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  function resizedataURL(datas: string, wantedWidth: number, wantedHeight: number): Promise<string> {
    return new Promise(function (resolve) {
      const img = document.createElement('img')
      img.onload = function () {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!

        canvas.width = wantedWidth
        canvas.height = wantedHeight

        ctx.drawImage(img, 0, 0, wantedWidth, wantedHeight)

        const dataURI = canvas.toDataURL()

        resolve(dataURI)
      }
      img.src = datas
    })
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
    upload,
  }
})

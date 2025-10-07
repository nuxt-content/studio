import { ref } from 'vue'
import { createStorage } from 'unstorage'
import indexedDbDriver from 'unstorage/drivers/indexedb'
import { joinURL, withLeadingSlash } from 'ufo'
import type { DraftItem, StudioHost, GithubFile, MediaItem, RawFile } from '../types'
import { DraftStatus } from '../types/draft'
import type { useGit } from './useGit'
import { getDraftStatus, findDescendantsFromId } from '../utils/draft'
import { createSharedComposable } from '@vueuse/core'
import { useHooks } from './useHooks'

const storage = createStorage({
  driver: indexedDbDriver({
    dbName: 'content-studio-media',
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

  async function create(media: MediaItem) {
    const existingItem = list.value.find(item => item.id === media.id) as DraftItem<MediaItem>
    if (existingItem) {
      throw new Error(`Draft file already exists for document ${media.id}`)
    }

    const fsPath = host.media.getFileSystemPath(media.id)
    const githubFile = await git.fetchFile(joinURL('public', fsPath), { cached: true }) as GithubFile

    const item: DraftItem = {
      id: media.id,
      fsPath,
      githubFile,
      status: getDraftStatus(media),
      modified: media,
    }

    await storage.setItem(media.id, item)

    list.value.push(item)

    await hooks.callHook('studio:draft:media:updated')

    return item
  }

  async function upload(parentFsPath: string, file: File) {
    const draftItem = await fileToDraftItem(parentFsPath, file)
    host.media.upsert(draftItem.id, draftItem.modified!)
    await create(draftItem.modified!)
  }

  async function fileToDraftItem(parentFsPath: string, file: File): Promise<DraftItem<MediaItem>> {
    const rawData = await fileToDataUrl(file)
    const fsPath = parentFsPath !== '/' ? joinURL(parentFsPath, file.name) : file.name

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

  async function remove(ids: string[]) {
    for (const id of ids) {
      const existingDraftItem = list.value.find(item => item.id === id)
      const fsPath = host.document.getFileSystemPath(id)
      const originalDbItem = await host.document.get(id)

      await storage.removeItem(id)
      await host.document.delete(id)

      let deleteDraftItem: DraftItem<MediaItem> | null = null
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
        await host.media.delete(draftItem.id)
        await storage.removeItem(draftItem.id)
        list.value = list.value.filter(item => item.id !== draftItem.id)
      }
      else {
        await host.media.upsert(draftItem.id, existingItem.original!)
        existingItem.status = getDraftStatus(existingItem.original!, existingItem.original)
        existingItem.modified = existingItem.original
        await storage.setItem(draftItem.id, existingItem)
      }
    }

    await hooks.callHook('studio:draft:media:updated')

    host.app.requestRerender()
  }

  async function rename(_items: { id: string, newFsPath: string }[]) {
    // let currentDbItem: MediaItem = await host.document.get(id)
    // if (!currentDbItem) {
    //   throw new Error(`Database item not found for document ${id}`)
    // }

    // const currentDraftItem: DraftItem<MediaItem> | undefined = list.value.find(item => item.id === id)
    // if (currentDraftItem) {
    //   currentDbItem = currentDraftItem.modified as DatabasePageItem
    // }

    // const newNameWithoutExtension = newFsPath.split('.').slice(0, -1).join('.')
    // const newId = `${currentDbItem.id.split('/').slice(0, -1).join('/')}/${newFsPath}`
    // const newPath = `${currentDbItem.path!.split('/').slice(0, -1).join('/')}/${newFsPath}`
    // const newStem = `${currentDbItem.stem.split('/').slice(0, -1).join('/')}/${newNameWithoutExtension}`
    // const newExtension = newFsPath.split('.').pop()!

    // const newDbItem = {
    //   ...currentDbItem,
    //   id: newId,
    //   path: newPath,
    //   stem: newStem,
    //   extension: newExtension,
    // }

    // return await update(id, newDbItem)
  }

  async function duplicate(_id: string): Promise<DraftItem<MediaItem>> {
    return { } as DraftItem<MediaItem>
    // let currentDbItem = await host.media.get(id)
    // if (!currentDbItem) {
    //   throw new Error(`Database item not found for document ${id}`)
    // }

    // const currentDraftItem = list.value.find(item => item.id === id)
    // if (currentDraftItem) {
    //   currentDbItem = currentDraftItem.modified!
    // }

    // const currentFsPath = currentDraftItem?.fsPath || host.document.getFileSystemPath(id)
    // const currentRoutePath = currentDbItem.path!
    // const currentContent = ''
    // const currentName = currentFsPath.split('/').pop()!
    // const currentExtension = currentName.split('.').pop()!
    // const currentNameWithoutExtension = currentName.split('.').slice(0, -1).join('.')

    // const newFsPath = `${currentFsPath.split('/').slice(0, -1).join('/')}/${currentNameWithoutExtension}-copy.${currentExtension}`
    // const newRoutePath = `${currentRoutePath.split('/').slice(0, -1).join('/')}/${currentNameWithoutExtension}-copy`

    // const newDbItem = await host.media.create(newFsPath, newRoutePath, currentContent)
    // return await create(newDbItem, DraftStatus.Created)
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

    const draftItem = await create(dbItem)
    select(draftItem)
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

  async function generateRawFiles(): Promise<RawFile[]> {
    const files = [] as RawFile[]
    for (const draftItem of list.value) {
      if (draftItem.status === DraftStatus.Deleted) {
        files.push({ path: joinURL('public', draftItem.fsPath), content: null, status: draftItem.status, encoding: 'base64' })
        continue
      }

      const content = (await draftItem.modified?.raw as string).replace(/^data:\w+\/\w+;base64,/, '')
      files.push({ path: joinURL('public', draftItem.fsPath), content, status: draftItem.status, encoding: 'base64' })
    }

    return files
  }

  return {
    get,
    create,
    update: () => {},
    remove,
    revert,
    rename,
    duplicate,
    list,
    load,
    current,
    select,
    selectById,
    upload,
    generateRawFiles,
  }
})

import { createStorage } from 'unstorage'
import indexedDbDriver from 'unstorage/drivers/indexedb'
import { joinURL, withLeadingSlash } from 'ufo'
import type { DraftItem, StudioHost, MediaItem, RawFile } from '../types'
import { DraftStatus } from '../types/draft'
import type { useGit } from './useGit'
import { createSharedComposable } from '@vueuse/core'
import { useBaseDraft } from './useDraftBase'
import { TreeRootId } from '../utils/tree'
import { generateStemFromFsPath } from '../../../module/src/runtime/utils/media'

const storage = createStorage<DraftItem<MediaItem>>({
  driver: indexedDbDriver({
    dbName: 'content-studio-media',
    storeName: 'drafts',
  }),
})

export const useDraftMedias = createSharedComposable((host: StudioHost, git: ReturnType<typeof useGit>) => {
  const {
    list,
    current,
    get,
    create,
    remove,
    revert,
    select,
    selectById,
    load,
  } = useBaseDraft('media', host, git, storage)

  async function upload(parentFsPath: string, file: File) {
    const draftItem = await fileToDraftItem(parentFsPath, file)
    host.media.upsert(draftItem.id, draftItem.modified!)
    await create(draftItem.modified!)
  }

  async function fileToDraftItem(parentFsPath: string, file: File): Promise<DraftItem<MediaItem>> {
    const rawData = await fileToDataUrl(file)
    const fsPath = parentFsPath !== '/' ? joinURL(parentFsPath, file.name) : file.name

    return {
      id: `${TreeRootId.Media}/${fsPath}`,
      fsPath,
      githubFile: undefined,
      status: DraftStatus.Created,
      modified: {
        id: joinURL(TreeRootId.Media, fsPath),
        fsPath,
        extension: fsPath.split('.').pop()!,
        stem: fsPath.split('.').join('.'),
        path: withLeadingSlash(fsPath),
        preview: await resizedataURL(rawData, 128, 128),
        raw: rawData,
      },
    }
  }

  async function rename(items: { id: string, newFsPath: string }[]) {
    for (const item of items) {
      const { id, newFsPath } = item

      const currentDbItem = await host.media.get(id)
      if (!currentDbItem) {
        throw new Error(`Database item not found for document ${id}`)
      }

      await remove([id])

      const newDbItem: MediaItem = {
        ...currentDbItem,
        id: joinURL(TreeRootId.Media, newFsPath),
        stem: generateStemFromFsPath(newFsPath),
        path: withLeadingSlash(newFsPath),
      }

      await host.media.upsert(newDbItem.id, newDbItem)
      await create(newDbItem, currentDbItem)
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
    duplicate: () => {},
    remove,
    revert,
    rename,
    list,
    load,
    current,
    select,
    selectById,
    upload,
    generateRawFiles,
  }
})

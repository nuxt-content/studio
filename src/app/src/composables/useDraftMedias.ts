import { joinURL, withLeadingSlash } from 'ufo'
import type { DraftItem, StudioHost, MediaItem, RawFile } from '../types'
import { TreeRootId } from '../types'
import { DraftStatus } from '../types/draft'
import type { useGit } from './useGit'
import { createSharedComposable } from '@vueuse/core'
import { useDraftBase } from './useDraftBase'
import { mediaStorage as storage } from '../utils/storage'
import { getFileExtension, slugifyFileName } from '../utils/file'
import { generateStemFromFsPath } from '../utils/media'
import { useHooks } from './useHooks'

const hooks = useHooks()

export const useDraftMedias = createSharedComposable((host: StudioHost, git: ReturnType<typeof useGit>) => {
  const {
    isLoading,
    list,
    current,
    get,
    create,
    remove,
    revert,
    revertAll,
    selectById,
    unselect,
    load,
  } = useDraftBase('media', host, git, storage)

  async function upload(parentFsPath: string, file: File) {
    const draftItem = await fileToDraftItem(parentFsPath, file)
    host.media.upsert(draftItem.id, draftItem.modified!)
    await create(draftItem.modified!)
  }

  async function fileToDraftItem(parentFsPath: string, file: File): Promise<DraftItem<MediaItem>> {
    const rawData = await fileToDataUrl(file)
    const slugifiedFileName = slugifyFileName(file.name)
    const fsPath = parentFsPath !== '/' ? joinURL(parentFsPath, slugifiedFileName) : slugifiedFileName

    return {
      id: joinURL(TreeRootId.Media, fsPath),
      fsPath,
      remoteFile: undefined,
      status: DraftStatus.Created,
      modified: {
        id: joinURL(TreeRootId.Media, fsPath),
        fsPath,
        extension: getFileExtension(fsPath),
        stem: fsPath.split('.').join('.'),
        path: withLeadingSlash(fsPath),
        raw: rawData,
      },
    }
  }

  async function rename(items: { id: string, newFsPath: string }[]) {
    for (const item of items) {
      const { id, newFsPath } = item

      const existingDraftToRename = list.value.find(draftItem => draftItem.id === id) as DraftItem<MediaItem>

      const currentDbItem = await host.media.get(id)
      if (!currentDbItem) {
        throw new Error(`Database item not found for document ${id}`)
      }

      await remove([id], { rerender: false })

      const newDbItem: MediaItem = {
        ...currentDbItem,
        id: joinURL(TreeRootId.Media, newFsPath),
        stem: generateStemFromFsPath(newFsPath),
        path: withLeadingSlash(newFsPath),
      }

      await host.media.upsert(newDbItem.id, newDbItem)

      let originalDbItem: MediaItem | undefined = currentDbItem
      if (existingDraftToRename) {
        originalDbItem = existingDraftToRename.original
      }

      await create(newDbItem, originalDbItem, { rerender: false })
    }

    await hooks.callHook('studio:draft:media:updated', { caller: 'useDraftMedias.rename' })
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  async function listAsRawFiles(): Promise<RawFile[]> {
    const files = [] as RawFile[]
    for (const draftItem of list.value) {
      if (draftItem.status === DraftStatus.Pristine) {
        continue
      }

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
    isLoading,
    list,
    current,
    get,
    create,
    update: () => {},
    duplicate: () => {},
    remove,
    revert,
    revertAll,
    rename,
    load,
    selectById,
    unselect,
    upload,
    listAsRawFiles,
  }
})

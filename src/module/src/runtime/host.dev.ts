import { useStudioHost as useStudioHostBase } from './host'
import type { StudioUser, DatabaseItem, Repository } from 'nuxt-studio/app'
import { generateContentFromDocument } from 'nuxt-studio/app/utils'
import { getCollectionByFilePath, generateIdFromFsPath, generateFsPathFromId, getCollectionById } from './utils/collection'
import { createCollectionDocument } from './utils/document'
import { createStorage } from 'unstorage'
import httpDriver from 'unstorage/drivers/http'
import { useRuntimeConfig } from '#imports'
import { collections } from '#content/preview'
import { debounce } from 'perfect-debounce'
import { getCollectionSourceById } from './utils/source'

export function useStudioHost(user: StudioUser, repository: Repository) {
  const host = useStudioHostBase(user, repository)

  if (!useRuntimeConfig().public.studio.development.sync) {
    return host
  }

  // enable dev mode
  host.meta.dev = true

  const devStorage = createStorage({
    driver: httpDriver({ base: '/__nuxt_studio/dev/content' }),
  })

  host.app.requestRerender = () => {
    // no operation let hmr do the job
  }

  // TODO @farnabaz to check
  host.document.upsert = debounce(async (fsPath: string, upsertedDocument: DatabaseItem) => {
    const collectionInfo = getCollectionByFilePath(fsPath, collections)
    if (!collectionInfo) {
      throw new Error(`Collection not found for fsPath: ${fsPath}`)
    }

    const id = generateIdFromFsPath(fsPath, collectionInfo)
    const doc = createCollectionDocument(id, collectionInfo, upsertedDocument)

    const content = await generateContentFromDocument(doc)

    await devStorage.setItem(fsPath, content, {
      headers: {
        'content-type': 'text/plain',
      },
    })
  }, 100)

  // TODO @farnabaz to check
  host.document.delete = async (fsPath: string) => {
    await devStorage.removeItem(fsPath)
  }

  // TODO @farnabaz
  host.on.documentUpdate = (fn: (id: string, type: 'remove' | 'update') => void) => {
    // @ts-expect-error import.meta.hot is not defined in types
    import.meta.hot.on('nuxt-content:update', (data: { key: string, queries: string[] }) => {
      const collection = getCollectionById(data.key, collections)
      const source = getCollectionSourceById(data.key, collection.source)
      const fsPath = generateFsPathFromId(data.key, source!)

      const isRemoved = data.queries.length === 0 // In case of update there is one remove and one insert query
      fn(fsPath, isRemoved ? 'remove' : 'update')
    })
  }

  // TODO @farnabaz
  host.on.mediaUpdate = (fn: (id: string, type: 'remove' | 'update') => void) => {
    // @ts-expect-error import.meta.hot is not defined in types
    import.meta.hot.on('nuxt-studio:media:update', (data: { type: string, id: string }) => {
      fn(data.id, data.type as 'remove' | 'update')
    })
  }

  return host
}

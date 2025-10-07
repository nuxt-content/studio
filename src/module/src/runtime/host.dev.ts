import { useStudioHost as useStudioHostBase } from './host'
import type { StudioUser, DatabaseItem, Repository } from 'nuxt-studio/app'
import { generateContentFromDocument } from 'nuxt-studio/app/utils'
import { createCollectionDocument, getCollectionInfo } from './utils/collection'
import { createStorage } from 'unstorage'
import httpDriver from 'unstorage/drivers/http'
import { useRuntimeConfig } from '#imports'
import { collections } from '#content/preview'
import { debounce } from 'perfect-debounce'

export function useStudioHost(user: StudioUser, repository: Repository) {
  const host = useStudioHostBase(user, repository)

  if (!useRuntimeConfig().public.contentStudio.studioDevStorage) {
    return host
  }
  // enable dev mode
  host.meta.dev = true

  const devStorage = createStorage({
    driver: httpDriver({ base: '/__nuxt_content/studio/dev/content' }),
  })

  host.app.requestRerender = () => {
    // no operation let hmr do the job
  }

  host.document.upsert = debounce(async (id: string, upsertedDocument: DatabaseItem) => {
    id = id.replace(/:/g, '/')

    const collection = getCollectionInfo(id, collections).collection
    const doc = createCollectionDocument(collection, id, upsertedDocument)

    const content = await generateContentFromDocument(doc)

    await devStorage.setItem(host.document.getFileSystemPath(id), content, {
      headers: {
        'content-type': 'text/plain',
      },
    })
  }, 100)

  host.document.delete = async (id: string) => {
    await devStorage.removeItem(host.document.getFileSystemPath(id.replace(/:/g, '/')))
  }

  host.on.documentUpdate = (fn: (id: string, type: 'remove' | 'update') => void) => {
    // @ts-expect-error import.meta.hot is not defined in types
    import.meta.hot.on('nuxt-content:update', (data: { key: string, queries: string[] }) => {
      const isRemoved = data.queries.length === 0 // In case of update there is one remove and one insert query
      fn(data.key, isRemoved ? 'remove' : 'update')
    })
  }

  host.on.mediaUpdate = (fn: (id: string, type: 'remove' | 'update') => void) => {
    // @ts-expect-error import.meta.hot is not defined in types
    import.meta.hot.on('nuxt-studio:media:update', (data: { type: string, id: string }) => {
      fn(data.id, data.type as 'remove' | 'update')
    })
  }

  return host
}

import { useStudioHost as useStudioHostBased } from './host'
import type { StudioUser, DatabaseItem, Repository } from 'nuxt-studio/app'
// TODO: use `nuxt-studio/app/utils` instead of `../../../app/src/utils`
import { generateContentFromDocument } from '../../../app/src/utils'
import { createCollectionDocument, getCollectionInfo } from './utils/collections'
import { createStorage } from 'unstorage'
import httpDriver from 'unstorage/drivers/http'
import { useRuntimeConfig } from '#imports'
import { collections } from '#content/preview'

export function useStudioHost(user: StudioUser, repository: Repository) {
  const host = useStudioHostBased(user, repository)

  if (!useRuntimeConfig().public.contentStudio.studioDevStorage) {
    return host
  }

  const devStorage = createStorage({
    driver: httpDriver({
      base: '/__nuxt_content/studio/dev/fs',
    }),
  })

  host.app.requestRerender = () => {
    // no operation let hmr do the job
  }

  host.document.upsert = async (id: string, upsertedDocument: DatabaseItem) => {
    id = id.replace(/:/g, '/')

    const collection = getCollectionInfo(id, collections).collection
    const doc = createCollectionDocument(collection, id, upsertedDocument)

    const content = await generateContentFromDocument(doc)

    await devStorage.setItem(host.document.getFileSystemPath(id), content, {
      headers: {
        'content-type': 'text/plain',
      },
    })
  }

  host.document.delete = async (id: string) => {
    id = id.replace(/:/g, '/')

    await devStorage.removeItem(host.document.getFileSystemPath(id))
  }

  return host
}

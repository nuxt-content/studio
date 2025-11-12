import type { CollectionInfo, CollectionItemBase, PageCollectionItemBase } from '@nuxt/content'
import { getOrderedSchemaKeys } from './collection'
import { pathMetaTransform } from './path-meta'
import type { DatabaseItem } from 'nuxt-studio/app'

export function createCollectionDocument(id: string, collectionInfo: CollectionInfo, document: CollectionItemBase) {
  const parsedContent = [
    pathMetaTransform,
  ].reduce((acc, fn) => collectionInfo.type === 'page' ? fn(acc as PageCollectionItemBase) : acc, { ...document, id } as PageCollectionItemBase)
  const result = { id } as DatabaseItem
  const meta = parsedContent.meta as Record<string, unknown>

  const collectionKeys = getOrderedSchemaKeys(collectionInfo.schema)
  for (const key of Object.keys(parsedContent)) {
    if (collectionKeys.includes(key)) {
      result[key] = parsedContent[key as keyof PageCollectionItemBase]
    }
    else {
      meta[key] = parsedContent[key as keyof PageCollectionItemBase]
    }
  }

  result.meta = meta

  // Storing `content` into `rawbody` field
  // TODO: handle rawbody
  // if (collectionKeys.includes('rawbody')) {
  //   result.rawbody = result.rawbody ?? file.body
  // }

  if (collectionKeys.includes('seo')) {
    const seo = result.seo = (result.seo || {}) as PageCollectionItemBase['seo']
    seo.title = seo.title || result.title as string
    seo.description = seo.description || result.description as string
  }

  return result
}

export function normalizeDocument(fsPath: string, document: DatabaseItem): DatabaseItem {
  // `seo` is an auto-generated field in content module
  // if `seo.title` and `seo.description` are same as `title` and `description`
  // we can remove it to avoid duplication
  if (document?.seo) {
    const seo = document.seo as Record<string, unknown>

    if (!seo.title || seo.title === document.title) {
      Reflect.deleteProperty(document.seo, 'title')
    }
    if (!seo.description || seo.description === document.description) {
      Reflect.deleteProperty(document.seo, 'description')
    }

    if (Object.keys(seo).length === 0) {
      Reflect.deleteProperty(document, 'seo')
    }
  }

  return {
    ...document,
    fsPath,
  }
}

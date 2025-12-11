import type { CollectionInfo, CollectionItemBase } from '@nuxt/content'
import type { DatabaseItem, DatabasePageItem } from 'nuxt-studio/app'
import { getOrderedSchemaKeys } from '../collection'
import { omit, pick } from '../object'
import { addPageTypeFields } from './utils'

export const reservedKeys = ['id', 'fsPath', 'stem', 'extension', '__hash__', 'path', 'body', 'meta', 'rawbody']

export function applyCollectionSchema(id: string, collectionInfo: CollectionInfo, document: CollectionItemBase) {
  let parsedContent = { ...document, id }
  if (collectionInfo.type === 'page') {
    parsedContent = addPageTypeFields(parsedContent)
  }

  const result = { id } as DatabaseItem
  const meta = parsedContent.meta

  const collectionKeys = getOrderedSchemaKeys(collectionInfo.schema)
  for (const key of Object.keys(parsedContent)) {
    if (collectionKeys.includes(key)) {
      result[key] = parsedContent[key as keyof typeof parsedContent]
    }
    else {
      meta[key] = parsedContent[key as keyof typeof parsedContent]
    }
  }

  // Clean fsPath from meta to avoid storing it in the database
  if (meta.fsPath) {
    Reflect.deleteProperty(meta, 'fsPath')
  }

  result.meta = meta

  // Storing `content` into `rawbody` field
  // TODO: handle rawbody
  // if (collectionKeys.includes('rawbody')) {
  //   result.rawbody = result.rawbody ?? file.body
  // }

  if (collectionKeys.includes('seo')) {
    const seo = result.seo = (result.seo || {}) as DatabasePageItem['seo']
    seo.title = seo.title || result.title as string
    seo.description = seo.description || result.description as string
  }

  return result
}

export function pickReservedKeysFromDocument(document: DatabaseItem): DatabaseItem {
  return pick(document, reservedKeys) as DatabaseItem
}

export function removeReservedKeysFromDocument(document: DatabaseItem): DatabaseItem {
  const result = omit(document, reservedKeys)
  // Default value of navigation is true, so we can safely remove it
  if (result.navigation === true) {
    Reflect.deleteProperty(result, 'navigation')
  }

  if (document.seo) {
    const seo = document.seo as Record<string, unknown>
    if (
      (!seo.title || seo.title === document.title)
      && (!seo.description || seo.description === document.description)
    ) {
      Reflect.deleteProperty(result, 'seo')
    }
  }

  if (!document.title) {
    Reflect.deleteProperty(result, 'title')
  }
  if (!document.description) {
    Reflect.deleteProperty(result, 'description')
  }

  // expand meta to the root
  for (const key in (document.meta || {})) {
    if (!reservedKeys.includes(key)) {
      result[key] = (document.meta as Record<string, unknown>)[key]
    }
  }

  for (const key in (result || {})) {
    if (result[key] === null) {
      Reflect.deleteProperty(result, key)
    }
  }

  return result as DatabaseItem
}

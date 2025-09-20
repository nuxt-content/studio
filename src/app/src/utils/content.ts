// import type { ParsedContentFile } from '@nuxt/content'
import { stringifyMarkdown } from '@nuxtjs/mdc/runtime'
import type { MDCRoot } from '@nuxtjs/mdc'
import { type DatabasePageItem, ContentFileExtension } from '../types'
import { omit } from './object'

export const contentFileExtensions = [
  ContentFileExtension.Markdown,
  ContentFileExtension.YAML,
  ContentFileExtension.YML,
  ContentFileExtension.JSON,
] as const

export function removeReservedKeysFromDocument(document: DatabasePageItem) {
  const result = omit(document, ['id', 'stem', 'extension', '__hash__', 'path', 'body', 'meta'])
  // Default value of navigation is true, so we can safely remove it
  if (result.navigation === true) {
    Reflect.deleteProperty(result, 'navigation')
  }

  if (document.seo) {
    const seo = document.seo as Record<string, unknown>
    if (seo.title === document.title) {
      Reflect.deleteProperty(result, 'seo')
    }
    if (seo.description === document.description) {
      Reflect.deleteProperty(result, 'seo')
    }
  }

  // expand meta to the root
  for (const key in (document.meta || {})) {
    if (key !== '__hash__') {
      result[key] = (document.meta as Record<string, unknown>)[key]
    }
  }
  return result
}

export async function generateContentFromDocument(document: DatabasePageItem): Promise<string | null> {
  return await stringifyMarkdown(document.body as unknown as MDCRoot, removeReservedKeysFromDocument(document))
}

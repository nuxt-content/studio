// import type { ParsedContentFile } from '@nuxt/content'
import { stringifyMarkdown, parseMarkdown } from '@nuxtjs/mdc/runtime'
import type { MDCRoot } from '@nuxtjs/mdc'
import { withoutReservedKeys } from './collections'
import { type DatabaseItem, ContentFileExtension } from '../types'

export const contentFileExtensions = [
  ContentFileExtension.Markdown,
  ContentFileExtension.YAML,
  ContentFileExtension.YML,
  ContentFileExtension.JSON,
] as const

export async function stringifyDocument(document: DatabaseItem): Promise<string | null> {
  return await stringifyMarkdown(document.body as MDCRoot, withoutReservedKeys(document))
}

export async function parseContent(content: string): Promise<DatabaseItem> {
  return await parseMarkdown(content) as DatabaseItem
}

import type { CollectionType } from '@nuxt/content'

export interface MarkdownParsingOptions {
  compress?: boolean
  collectionType?: CollectionType
}

export interface SyntaxHighlightTheme {
  default: string
  dark?: string
  light?: string
}

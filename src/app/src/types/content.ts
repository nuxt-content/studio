import type { CollectionInfo } from '@nuxt/content'

export interface MarkdownParsingOptions {
  compress?: boolean
  collection?: CollectionInfo
}

export interface SyntaxHighlightTheme {
  default: string
  dark?: string
  light?: string
}

import type { CollectionInfo, CollectionQueryBuilder, Collections, PageCollections, ContentNavigationItem, SurroundOptions, DatabaseAdapter } from '@nuxt/content'

type ChainablePromise<T, R> = { then: (fn: (value: R) => void) => ChainablePromise<T, R> }

export interface ContentProvide {
  queryCollection: <T extends keyof Collections>(collection: string) => CollectionQueryBuilder<Collections[T]>
  queryCollectionNavigation: <T extends keyof PageCollections>(collection: string, fields?: Array<keyof PageCollections[T]>) => ChainablePromise<T, ContentNavigationItem[]>
  queryCollectionItemSurroundings: <T extends keyof PageCollections>(collection: T, path: string, opts?: SurroundOptions<keyof PageCollections[T]>) => ChainablePromise<T, ContentNavigationItem[]>
  queryCollectionSearchSections: (collection: keyof Collections, opts?: { ignoredTags: string[] }) => Promise<Array<{ id: string, title: string, titles: string[], level: number, content: string }>>
  collections: Record<string, CollectionInfo>
}
export type ContentDatabaseAdapter = (collection: string) => DatabaseAdapter

export { ContentFileExtension } from '../runtime/types/content'

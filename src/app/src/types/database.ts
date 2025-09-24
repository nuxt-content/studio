import type { CollectionItemBase, PageCollectionItemBase, DataCollectionItemBase } from '@nuxt/content'
import type { BaseItem } from './item'

export interface DatabaseItem extends CollectionItemBase, BaseItem {
  [key: string]: unknown
}

export interface DatabasePageItem extends PageCollectionItemBase, BaseItem {
  path: string
  [key: string]: unknown
}

export interface DatabaseDataItem extends DataCollectionItemBase, BaseItem {
  [key: string]: unknown
}

declare module '#content/preview' {
  import type { CollectionInfo } from './collection'

  export const collections: Record<string, CollectionInfo>
  export const gitInfo: GitInfo
  export const appConfigSchema: Record<string, unknown>
}

declare module '#build/content-studio-public-assets' {
  import type { Storage } from 'unstorage'

  export const publicAssetsStorage: Storage
}

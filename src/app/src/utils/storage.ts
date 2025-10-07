import { createStorage } from "unstorage"
import indexedDbDriver from "unstorage/drivers/indexedb"
import nullDriver from "unstorage/drivers/null"

export const nullStorageDriver = nullDriver()

export const indexedDbStorageDriver = (name: string) => indexedDbDriver({
  dbName: `content-studio-${name}`,
  storeName: 'drafts',
})

export const documentStorage = createStorage({ driver: indexedDbStorageDriver('document') })

export const mediaStorage = createStorage({ driver: indexedDbStorageDriver('media') })
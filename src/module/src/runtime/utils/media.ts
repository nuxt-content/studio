import { join } from 'pathe'
import { VirtualMediaCollectionName } from 'nuxt-studio/app/utils'

export function generateIdFromFsPath(fsPath: string) {
  return join(VirtualMediaCollectionName, fsPath)
}

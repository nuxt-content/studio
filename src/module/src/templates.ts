import type { Storage } from 'unstorage'
import type { Nuxt } from '@nuxt/schema'
import { withLeadingSlash } from 'ufo'

export async function getAssetsStorageDevTemplate(_assetsStorage: Storage, _nuxt: Nuxt) {
  return [
    'import { createStorage } from \'unstorage\'',
    'import httpDriver from \'unstorage/drivers/http\'',
    '',
    `const storage = createStorage({ driver: httpDriver({ base: '/__nuxt_studio/dev/public' }) })`,
    'export const publicAssetsStorage = storage',
  ].join('\n')
}

export async function getAssetsStorageTemplate(assetsStorage: Storage, _nuxt: Nuxt) {
  const keys = await assetsStorage.getKeys()

  return [
    'import { createStorage } from \'unstorage\'',
    'const storage = createStorage({})',
    '',
    ...keys.map((key) => {
      const path = withLeadingSlash(key.replace(/:/g, '/'))
      const value = {
        id: `public-assets/${key.replace(/:/g, '/')}`,
        extension: key.split('.').pop(),
        stem: key.split('.').join('.'),
        path,
        fsPath: path,
      }
      return `storage.setItem('${value.id}', ${JSON.stringify(value)})`
    }),
    '',
    'export const publicAssetsStorage = storage',
  ].join('\n')
}

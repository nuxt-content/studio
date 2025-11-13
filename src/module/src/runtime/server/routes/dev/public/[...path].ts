import type { H3Event } from 'h3'
import { createError, eventHandler, getRequestHeader, readRawBody, setResponseHeader } from 'h3'
import type { Storage, StorageMeta } from 'unstorage'
import { withLeadingSlash } from 'ufo'
// @ts-expect-error useStorage is not defined in .nuxt/imports.d.ts
import { useStorage } from '#imports'

export default eventHandler(async (event) => {
  const path = event.path.replace('/__nuxt_studio/dev/public/', '')
  const key = path.replace(/\//g, ':').replace(/^public-assets:/, '')
  const storage = useStorage('nuxt_studio_public_assets') as Storage

  // GET => getItem / getKeys
  if (event.method === 'GET') {
    const lastChar = key[key.length - 1];
    const isBaseKey = lastChar === "/" || lastChar === ":";
    if (isBaseKey) {
      const keys = await storage.getKeys(key);
      return keys.map((key) => key.replace(/:/g, "/"));
    }

    const item = await storage.getMeta(key)
    if (!item) {
      throw createError({
        statusCode: 404,
        statusMessage: 'KV value not found',
      })
    }
    return {
      id: `public-assets/${key.replace(/:/g, '/')}`,
      extension: key.split('.').pop(),
      stem: key.split('.').join('.'),
      path: '/' + key.replace(/:/g, '/'),
      fsPath: withLeadingSlash(key.replace(/:/g, '/')),
      version: new Date(item.mtime || new Date()).getTime(),
    }
  }

  if (event.method === 'PUT') {
    if (getRequestHeader(event, 'content-type') === 'application/octet-stream') {
      const value = await readRawBody(event, false)
      await storage.setItemRaw(key, value)
    }
    else if (getRequestHeader(event, 'content-type') === 'text/plain') {
      const value = await readRawBody(event, 'utf8')
      await storage.setItem(key, value!)
    }
    else {
      const value = await readRawBody(event, 'utf8')
      const json = JSON.parse(value || '{}')

      const data = json.raw.split(';base64,')[1]
      await storage.setItemRaw(key, Buffer.from(data, 'base64'))
    }

    return 'OK'
  }

  // DELETE => removeItem
  if (event.method === 'DELETE') {
    await storage.removeItem(key)
    return 'OK'
  }
})

function setMetaHeaders(event: H3Event, meta: StorageMeta) {
  if (meta.mtime) {
    setResponseHeader(
      event,
      'last-modified',
      new Date(meta.mtime).toUTCString(),
    )
  }
  if (meta.ttl) {
    setResponseHeader(event, 'x-ttl', `${meta.ttl}`)
    setResponseHeader(event, 'cache-control', `max-age=${meta.ttl}`)
  }
}

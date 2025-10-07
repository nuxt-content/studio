import type { H3Event } from 'h3'
import { createError, eventHandler, getRequestHeader, readRawBody, setResponseHeader } from 'h3'
import type { StorageMeta } from 'unstorage'
import { stringifyMarkdown } from '@nuxtjs/mdc/runtime'
import { decompressTree } from '@nuxt/content/runtime'
import { removeReservedKeysFromDocument } from '../../../../utils/content'
// @ts-expect-error useStorage is not defined in .nuxt/imports.d.ts
import { useStorage } from '#imports'

export default eventHandler(async (event) => {
  const path = event.path.replace('/__nuxt_content/studio/dev/content/', '')
  const key = path.replace(/\//g, ':').replace(/^content:/, '')
  const storage = useStorage('nuxt_studio_content')

  // GET => getItem / getKeys
  if (event.method === 'GET') {
    const isRaw
      = getRequestHeader(event, 'accept') === 'application/octet-stream'
    const driverValue = await (isRaw
      ? storage.getItemRaw(key)
      : storage.getItem(key))
    if (driverValue === null) {
      throw createError({
        statusCode: 404,
        statusMessage: 'KV value not found',
      })
    }
    setMetaHeaders(event, await storage.getMeta(key))
    return isRaw ? driverValue : String(driverValue)
  }

  if (event.method === 'PUT') {
    if (getRequestHeader(event, 'content-type') === 'application/octet-stream') {
      const value = await readRawBody(event, false)
      await storage.setItemRaw(key, value)
    }
    else if (getRequestHeader(event, 'content-type') === 'text/plain') {
      const value = await readRawBody(event, 'utf8')
      await storage.setItem(key, value)
    }
    else {
      const value = await readRawBody(event, 'utf8')
      const json = JSON.parse(value || '{}')
      const content = await stringifyMarkdown(
        json.body.type === 'minimark' ? decompressTree(json.body) : json.body,
        removeReservedKeysFromDocument(json),
      )

      await storage.setItem(key, content)
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

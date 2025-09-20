import type { H3Event } from 'h3'
import { createError, eventHandler, getRequestHeader, readRawBody, setResponseHeader } from 'h3'
import type { StorageMeta, TransactionOptions } from 'unstorage'
import { stringifyMarkdown } from '@nuxtjs/mdc/runtime'
import { decompressTree } from '@nuxt/content/runtime'
import { removeReservedKeysFromDocument } from '../../../../utils/content'
import { useStorage } from '#imports'

export default eventHandler(async (event) => {
  const path = event.path.replace('/__nuxt_content/studio/dev/fs/', '')
  const key = path.replace(/\//g, ':').replace(/^content:/, '')
  const storage = useStorage('nuxt_content_studio')

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
    const isRaw
      = getRequestHeader(event, 'content-type') === 'application/octet-stream'
    const topts: TransactionOptions = {
      ttl: Number(getRequestHeader(event, 'x-ttl')) || undefined,
    }
    if (isRaw) {
      const value = await readRawBody(event, false)
      await storage.setItemRaw(key, value, topts)
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

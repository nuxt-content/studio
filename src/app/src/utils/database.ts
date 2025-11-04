import { compressTree } from '@nuxt/content/runtime'
import { type DatabasePageItem, ContentFileExtension } from '../types'
import { stringify } from 'minimark/stringify'
import type { MDCRoot } from '@nuxtjs/mdc'
import type { MarkdownRoot } from '@nuxt/content'
import { isDeepEqual } from './object'

export function isEqual(document1: Record<string, unknown>, document2: Record<string, unknown>) {
  function withoutLastStyles(body: MarkdownRoot) {
    if (body.value[body.value.length - 1]?.[0] === 'style') {
      return { ...body, value: body.value.slice(0, -1) }
    }
    return body
  }

  const { body: body1, meta: meta1, ...documentData1 } = document1
  const { body: body2, meta: meta2, ...documentData2 } = document2

  // Compare body first
  if (document1.extension === ContentFileExtension.Markdown) {
    const minifiedBody1 = withoutLastStyles(
      (document1 as DatabasePageItem).body.type === 'minimark' ? document1.body as MarkdownRoot : compressTree(document1.body as unknown as MDCRoot),
    )
    const minifiedBody2 = withoutLastStyles(
      (document2 as DatabasePageItem).body.type === 'minimark' ? document2.body as MarkdownRoot : compressTree(document2.body as unknown as MDCRoot),
    )

    if (stringify(minifiedBody1) !== stringify(minifiedBody2)) {
      return false
    }
  }
  else if (typeof body1 === 'object' && typeof body2 === 'object') {
    if (!isDeepEqual(body1 as Record<string, unknown>, body2 as Record<string, unknown>)) {
      return false
    }
  }
  else {
    // For other file types, we compare the JSON stringified bodies
    if (JSON.stringify(body1) !== JSON.stringify(body2)) {
      return false
    }
  }

  const data1 = refineDocumentData({ ...documentData1, ...(meta1 || {}) })
  const data2 = refineDocumentData({ ...documentData2, ...(meta2 || {}) })
  if (!isDeepEqual(data1, data2)) {
    return false
  }

  return true
}

function refineDocumentData(doc: Record<string, unknown>) {
  if (doc.seo) {
    const seo = doc.seo as Record<string, unknown>
    doc.seo = {
      ...seo,
      title: seo.title || doc.title,
      description: seo.description || doc.description,
    }
  }
  // documents with same id are being compared, so it is safe to remove `path` and `__hash__`
  Reflect.deleteProperty(doc, '__hash__')
  Reflect.deleteProperty(doc, 'path')

  // default value of navigation is true
  if (typeof doc.navigation === 'undefined') {
    doc.navigation = true
  }

  return doc
}

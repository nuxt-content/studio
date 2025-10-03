import { compressTree } from '@nuxt/content/runtime'
import { type DatabasePageItem, ContentFileExtension } from '../types'
import { stringify } from 'minimark/stringify'
import type { MDCRoot } from '@nuxtjs/mdc'
import type { MarkdownRoot } from '@nuxt/content'

export function isEqual(document1: DatabasePageItem, document2: DatabasePageItem) {
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
      document1.body.type === 'minimark' ? document1.body : compressTree(document1.body as unknown as MDCRoot),
    )
    const minifiedBody2 = withoutLastStyles(
      document2.body.type === 'minimark' ? document2.body : compressTree(document2.body as unknown as MDCRoot),
    )

    if (stringify(minifiedBody1) !== stringify(minifiedBody2)) {
      return false
    }
  }
  else {
    // For other file types, we compare the JSON stringified bodies
    if (JSON.stringify(body1) !== JSON.stringify(body2)) {
      return false
    }
  }

  if (JSON.stringify(documentData1) !== JSON.stringify(documentData2)) {
    return false
  }

  if (meta1 && meta2) {
    const { __hash__: _hash1, ...metaFields1 } = meta1
    const { __hash__: _hash2, ...metaFields2 } = meta2
    if (JSON.stringify(metaFields1) !== JSON.stringify(metaFields2)) {
      return false
    }
  }

  return true
}

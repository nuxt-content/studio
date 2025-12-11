import type { MarkdownRoot } from '@nuxt/content'
import type { MDCRoot } from '@nuxtjs/mdc'
import type { DatabaseItem, DatabasePageItem } from 'nuxt-studio/app'
import { ContentFileExtension } from '../../types/content'
import { doObjectsMatch } from '../object'
import { stringify } from 'minimark/stringify'
import { compressTree } from '@nuxt/content/runtime'
import { generateDocumentFromContent } from './generate'
import { removeLastStylesFromTree } from './tree'

export async function isDocumentMatchingContent(content: string, document: DatabaseItem): Promise<boolean> {
  const generatedDocument = await generateDocumentFromContent(document.id, content) as DatabaseItem

  if (generatedDocument.extension === ContentFileExtension.Markdown) {
    const { body: generatedBody, ...generatedDocumentData } = generatedDocument
    const { body: documentBody, ...documentData } = document

    const cleanedGeneratedBody = removeLastStylesFromTree(generatedBody as MarkdownRoot)
    const cleanedDocumentBody = removeLastStylesFromTree(documentBody as MarkdownRoot)
    // Remove new lines because they are not significant for the comparison
    const generatedBodyStringified = stringify(cleanedGeneratedBody).replace(/\n/g, '')
    const documentBodyStringified = stringify(cleanedDocumentBody).replace(/\n/g, '')
    if (generatedBodyStringified !== documentBodyStringified) {
      return false
    }

    return doObjectsMatch(generatedDocumentData, documentData)
  }

  return doObjectsMatch(generatedDocument, document)
}

export function areDocumentsEqual(document1: Record<string, unknown>, document2: Record<string, unknown>) {
  const { body: body1, meta: meta1, ...documentData1 } = document1
  const { body: body2, meta: meta2, ...documentData2 } = document2

  // Compare body first
  if (document1.extension === ContentFileExtension.Markdown) {
    const minifiedBody1 = removeLastStylesFromTree(
      (document1 as DatabasePageItem).body.type === 'minimark' ? document1.body as MarkdownRoot : compressTree(document1.body as unknown as MDCRoot),
    )
    const minifiedBody2 = removeLastStylesFromTree(
      (document2 as DatabasePageItem).body.type === 'minimark' ? document2.body as MarkdownRoot : compressTree(document2.body as unknown as MDCRoot),
    )

    if (stringify(minifiedBody1) !== stringify(minifiedBody2)) {
      return false
    }
  }
  else if (typeof body1 === 'object' && typeof body2 === 'object') {
    if (!doObjectsMatch(body1 as Record<string, unknown>, body2 as Record<string, unknown>)) {
      return false
    }
  }
  else {
    // For other file types, we compare the JSON stringified bodies
    if (JSON.stringify(body1) !== JSON.stringify(body2)) {
      return false
    }
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

    // Normalize date values to ISO string format for comparison
    for (const key in doc) {
      const value = doc[key]
      if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
        // Check if it looks like a date string (YYYY-MM-DD or ISO format)
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
          doc[key] = new Date(value).toISOString().split('T')[0]
        }
      }
    }

    // Remove null and undefined values recursively
    function removeNullAndUndefined(obj: Record<string, unknown>): Record<string, unknown> {
      const result: Record<string, unknown> = {}

      for (const key in obj) {
        const value = obj[key]

        // Skip null and undefined values
        if (value === null || value === undefined) {
          continue
        }

        // Recursively clean nested objects (but not arrays)
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
          result[key] = removeNullAndUndefined(value as Record<string, unknown>)
        }
        else {
          result[key] = value
        }
      }

      return result
    }

    return removeNullAndUndefined(doc)
  }

  const data1 = refineDocumentData({ ...documentData1, ...(meta1 || {}) })
  const data2 = refineDocumentData({ ...documentData2, ...(meta2 || {}) })
  if (!doObjectsMatch(data1, data2)) {
    return false
  }

  return true
}

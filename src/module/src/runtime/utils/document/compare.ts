import type { Node as MarkdownNode, MarkdownDocument, ElementNodeAttributes } from 'comark'
import type { DatabaseItem } from 'nuxt-studio/app'
import { ContentFileExtension } from '../../types/content'
import { doObjectsMatch } from '../object'
import { renderMarkdown } from 'comark/render'
import { documentFromContent } from './generate'
import { cleanDataKeys } from './schema'
import { comarkTreeFromLegacyDocument } from './legacy'

const EMPTY_TREE: MarkdownDocument = { nodes: [], frontmatter: {}, meta: {} }

// Legacy bodies (MarkdownRoot/minimark, no `.nodes`) make renderMarkdown throw unless upgraded.
function comarkBody(document: Record<string, unknown>): MarkdownDocument {
  return comarkTreeFromLegacyDocument(document as DatabaseItem) ?? EMPTY_TREE
}

/**
 * Sort and normalize every element's attributes alphabetically.
 */
function normalizeAttrsDeep(tree: MarkdownDocument): MarkdownDocument {
  return { ...tree, nodes: tree.nodes.map(normalizeNode) }
}

/**
 * Unwrap a leading `#default` slot marker, which comark keeps but `@nuxtjs/mdc` erases.
 */
function unwrapLeadingDefaultSlot(children: MarkdownNode[]): MarkdownNode[] {
  const [first, ...rest] = children
  if (!Array.isArray(first) || first[0] !== 'template') return children

  // Leading and attribute-free only: elsewhere the marker is load-bearing, and attributes
  // are content. `$` is comark-internal, ignored by its template handler too.
  const attrs = (first[1] || {}) as Record<string, unknown>
  if (attrs.name !== 'default' || Object.keys(attrs).some(key => key !== 'name' && key !== '$')) {
    return children
  }

  return [...(first.slice(2) as MarkdownNode[]), ...rest]
}

/**
 * Strip the `language: 'text'` artifact from a bare ``` fence.
 */
function stripTextLanguageArtifact(attrs: ElementNodeAttributes, children: MarkdownNode[]): { attrs: ElementNodeAttributes, children: MarkdownNode[] } {
  if (attrs.language !== 'text') return { attrs, children }

  const nextAttrs = { ...attrs }
  delete nextAttrs.language

  const nextChildren = children.map((child, index) => {
    if (index !== 0 || !Array.isArray(child)) return child
    const [childTag, childAttrs, ...rest] = child as [string, Record<string, unknown>, ...MarkdownNode[]]
    if (childTag !== 'code' || typeof childAttrs?.class !== 'string') return child
    const remaining = childAttrs.class.split(/\s+/).filter(cls => cls && cls !== 'language-text')
    const nextChildAttrs = { ...childAttrs }
    if (remaining.length) nextChildAttrs.class = remaining.join(' ')
    else delete nextChildAttrs.class
    return [childTag, nextChildAttrs, ...rest] as MarkdownNode
  })

  return { attrs: nextAttrs, children: nextChildren }
}

function normalizeNode(node: MarkdownNode): MarkdownNode {
  if (typeof node === 'string') return node
  if (!Array.isArray(node)) return node

  const [tag] = node
  let [, attrs, ...children] = node
  if (tag === null) return node // comment

  if (tag === 'pre') {
    const stripped = stripTextLanguageArtifact(attrs, children as MarkdownNode[])
    attrs = stripped.attrs
    children = stripped.children
  }

  const sortedAttrs = attrs && typeof attrs === 'object'
    ? Object.fromEntries(Object.entries(attrs as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
    : attrs

  const normalizedChildren = unwrapLeadingDefaultSlot(children as MarkdownNode[]).map(normalizeNode)

  return [tag, sortedAttrs, ...normalizedChildren] as MarkdownNode
}

export async function isDocumentMatchingContent(content: string, document: DatabaseItem): Promise<boolean> {
  const generatedDocument = await documentFromContent(document.id, content, { compress: true, preserveLinkAttributes: true }) as DatabaseItem

  if (generatedDocument.extension === ContentFileExtension.Markdown) {
    // Compare body nodes only (not frontmatter — that's compared separately via doObjectsMatch below).
    const generatedNormalized = normalizeAttrsDeep({ ...(generatedDocument.body as MarkdownDocument), frontmatter: {} })
    const documentNormalized = normalizeAttrsDeep({ ...comarkBody(document), frontmatter: {} })
    const generatedBodyStringified = (await renderMarkdown(generatedNormalized)).replace(/\n/g, '')
    const documentBodyStringified = (await renderMarkdown(documentNormalized)).replace(/\n/g, '')
    if (generatedBodyStringified !== documentBodyStringified) {
      return false
    }

    // @nuxt/content may store unknown frontmatter fields in `meta` instead of top-level columns.
    return doObjectsMatch(
      cleanDataKeys(generatedDocument) as Record<string, unknown>,
      cleanDataKeys(document) as Record<string, unknown>,
    )
  }

  return doObjectsMatch(generatedDocument, document)
}

export async function areDocumentsEqual(document1: Record<string, unknown>, document2: Record<string, unknown>) {
  const { body: body1, meta: meta1, ...documentData1 } = document1
  const { body: body2, meta: meta2, ...documentData2 } = document2

  // Compare body first
  if (document1.extension === ContentFileExtension.Markdown) {
    if (await renderMarkdown(comarkBody(document1)) !== await renderMarkdown(comarkBody(document2))) {
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

    // default value of navigation is true; D1 may store it as string 'true'
    if (typeof doc.navigation === 'undefined' || doc.navigation === 'true') {
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

import type { CollectionInfo, CollectionItemBase, MarkdownRoot, PageCollectionItemBase } from '@nuxt/content'
import { getOrderedSchemaKeys } from './collection'
import { pathMetaTransform } from './path-meta'
import type { DatabaseItem, DatabasePageItem } from 'nuxt-studio/app'
import { areObjectsEqual, omit, pick } from './object'
import { ContentFileExtension } from '../types/content'
import { parseMarkdown } from '@nuxtjs/mdc/runtime/parser/index'
import type { MDCElement, MDCRoot } from '@nuxtjs/mdc'
import { visit } from 'unist-util-visit'
import { compressTree, decompressTree } from '@nuxt/content/runtime'
import destr from 'destr'
import { parseFrontMatter, stringifyFrontMatter } from 'remark-mdc'
import { stringify } from 'minimark/stringify'
// import type { ParsedContentFile } from '@nuxt/content'
import { stringifyMarkdown } from '@nuxtjs/mdc/runtime'
import type { Node } from 'unist'

const reservedKeys = ['id', 'fsPath', 'stem', 'extension', '__hash__', 'path', 'body', 'meta', 'rawbody']

/*
** Normalization utils
*/
export function normalizeDocument(fsPath: string, document: DatabaseItem): DatabaseItem {
  return {
    ...document,
    fsPath,
  }
}

export function pickReservedKeysFromDocument(document: DatabaseItem) {
  return pick(document, reservedKeys) as DatabaseItem
}

export function removeReservedKeysFromDocument(document: DatabaseItem) {
  const result = omit(document, reservedKeys)
  // Default value of navigation is true, so we can safely remove it
  if (result.navigation === true) {
    Reflect.deleteProperty(result, 'navigation')
  }

  if (document.seo) {
    const seo = document.seo as Record<string, unknown>
    if (
      (!seo.title || seo.title === document.title)
      && (!seo.description || seo.description === document.description)
    ) {
      Reflect.deleteProperty(result, 'seo')
    }
  }

  if (!document.title) {
    Reflect.deleteProperty(result, 'title')
  }
  if (!document.description) {
    Reflect.deleteProperty(result, 'description')
  }

  // expand meta to the root
  for (const key in (document.meta || {})) {
    if (key !== '__hash__') {
      result[key] = (document.meta as Record<string, unknown>)[key]
    }
  }

  for (const key in (result || {})) {
    if (result[key] === null) {
      Reflect.deleteProperty(result, key)
    }
  }

  return result as DatabaseItem
}

/*
** Comparison utils
*/
export async function isDocumentMatchingContent(content: string, document: DatabaseItem): Promise<boolean> {
  const generatedDocument = await generateDocumentFromContent(document.id, content) as DatabaseItem
  return areObjectsEqual(generatedDocument, document)
}

export function areDocumentsEqual(document1: Record<string, unknown>, document2: Record<string, unknown>) {
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
    if (!areObjectsEqual(body1 as Record<string, unknown>, body2 as Record<string, unknown>)) {
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

    return doc
  }

  const data1 = refineDocumentData({ ...documentData1, ...(meta1 || {}) })
  const data2 = refineDocumentData({ ...documentData2, ...(meta2 || {}) })
  if (!areObjectsEqual(data1, data2)) {
    return false
  }

  return true
}

/*
** Generation utils
*/
export function populateDocumentbasedOnCollectionInfo(id: string, collectionInfo: CollectionInfo, document: CollectionItemBase) {
  const parsedContent = [
    pathMetaTransform,
  ].reduce((acc, fn) => collectionInfo.type === 'page' ? fn(acc as PageCollectionItemBase) : acc, { ...document, id } as PageCollectionItemBase)
  const result = { id } as DatabaseItem
  const meta = parsedContent.meta as Record<string, unknown>

  const collectionKeys = getOrderedSchemaKeys(collectionInfo.schema)
  for (const key of Object.keys(parsedContent)) {
    if (collectionKeys.includes(key)) {
      result[key] = parsedContent[key as keyof PageCollectionItemBase]
    }
    else {
      meta[key] = parsedContent[key as keyof PageCollectionItemBase]
    }
  }

  result.meta = meta

  // Storing `content` into `rawbody` field
  // TODO: handle rawbody
  // if (collectionKeys.includes('rawbody')) {
  //   result.rawbody = result.rawbody ?? file.body
  // }

  if (collectionKeys.includes('seo')) {
    const seo = result.seo = (result.seo || {}) as PageCollectionItemBase['seo']
    seo.title = seo.title || result.title as string
    seo.description = seo.description || result.description as string
  }

  return result
}

export async function generateDocumentFromContent(id: string, content: string): Promise<DatabaseItem | null> {
  const [_id, _hash] = id.split('#')
  const extension = getFileExtension(id)

  if (extension === ContentFileExtension.Markdown) {
    return await generateDocumentFromMarkdownContent(id, content)
  }

  if (extension === ContentFileExtension.YAML || extension === ContentFileExtension.YML) {
    return await generateDocumentFromYAMLContent(id, content)
  }

  if (extension === ContentFileExtension.JSON) {
    return await generateDocumentFromJSONContent(id, content)
  }

  return null
}

export async function generateDocumentFromYAMLContent(id: string, content: string): Promise<DatabaseItem> {
  const { data } = parseFrontMatter(`---\n${content}\n---`)

  // Keep array contents under `body` key
  let parsed = data
  if (Array.isArray(data)) {
    console.warn(`YAML array is not supported in ${id}, moving the array into the \`body\` key`)
    parsed = { body: data }
  }

  return {
    id,
    extension: getFileExtension(id),
    stem: generateStemFromId(id),
    meta: {},
    ...parsed,
    body: parsed.body || parsed,
  } as DatabaseItem
}

export async function generateDocumentFromJSONContent(id: string, content: string): Promise<DatabaseItem> {
  let parsed: Record<string, unknown> = destr(content)

  // Keep array contents under `body` key
  if (Array.isArray(parsed)) {
    console.warn(`JSON array is not supported in ${id}, moving the array into the \`body\` key`)
    parsed = {
      body: parsed,
    }
  }

  // fsPath will be overridden by host
  return {
    id,
    extension: ContentFileExtension.JSON,
    stem: generateStemFromId(id),
    meta: {},
    ...parsed,
    body: parsed.body || parsed,
  } as DatabaseItem
}

export async function generateDocumentFromMarkdownContent(id: string, content: string): Promise<DatabaseItem> {
  const document = await parseMarkdown(content, {
    remark: {
      plugins: {
        'remark-mdc': {
          options: {
            autoUnwrap: true,
          },
        },
      },
    },
  })

  // Remove nofollow from links
  visit(document.body, (node: unknown) => (node as MDCElement).type === 'element' && (node as MDCElement).tag === 'a', (node: unknown) => {
    if ((node as MDCElement).props?.rel?.join(' ') === 'nofollow') {
      Reflect.deleteProperty((node as MDCElement).props!, 'rel')
    }
  })

  const body = document.body.type === 'root' ? compressTree(document.body) : document.body as never as MarkdownRoot

  const result = {
    id,
    meta: {},
    extension: 'md',
    stem: id.split('/').slice(1).join('/').split('.').slice(0, -1).join('.'),
    body: {
      ...body,
      toc: document.toc,
    },
    ...document.data,
  }

  return pathMetaTransform(result as PageCollectionItemBase) as DatabaseItem
}

export async function generateContentFromDocument(document: DatabaseItem): Promise<string | null> {
  const [id, _hash] = document.id.split('#')
  const extension = getFileExtension(id!)

  if (extension === ContentFileExtension.Markdown) {
    return await generateContentFromMarkdownDocument(document as DatabasePageItem)
  }

  if (extension === ContentFileExtension.YAML || extension === ContentFileExtension.YML) {
    return await generateContentFromYAMLDocument(document)
  }

  if (extension === ContentFileExtension.JSON) {
    return await generateContentFromJSONDocument(document)
  }

  return null
}

export async function generateContentFromYAMLDocument(document: DatabaseItem): Promise<string | null> {
  return await stringifyFrontMatter(removeReservedKeysFromDocument(document), '', {
    prefix: '',
    suffix: '',
    lineWidth: 0,
  })
}

export async function generateContentFromJSONDocument(document: DatabaseItem): Promise<string | null> {
  return JSON.stringify(removeReservedKeysFromDocument(document), null, 2)
}

export async function generateContentFromMarkdownDocument(document: DatabasePageItem): Promise<string | null> {
  // @ts-expect-error todo fix MarkdownRoot/MDCRoot conversion in MDC module
  const body = document.body.type === 'minimark' ? decompressTree(document.body) : (document.body as MDCRoot)

  // Remove nofollow from links
  visit(body, (node: Node) => (node as MDCElement).type === 'element' && (node as MDCElement).tag === 'a', (node: Node) => {
    if ((node as MDCElement).props?.rel?.join(' ') === 'nofollow') {
      Reflect.deleteProperty((node as MDCElement).props!, 'rel')
    }
  })

  const markdown = await stringifyMarkdown(body, removeReservedKeysFromDocument(document), {
    frontMatter: {
      options: {
        lineWidth: 0,
      },
    },
    plugins: {
      remarkMDC: {
        options: {
          autoUnwrap: true,
        },
      },
    },
  })

  return typeof markdown === 'string' ? markdown.replace(/&#x2A;/g, '*') : markdown
}

function generateStemFromId(id: string) {
  return id.split('/').slice(1).join('/').split('.').slice(0, -1).join('.')
}

function getFileExtension(id: string) {
  return id.split('#')[0]?.split('.').pop()!.toLowerCase()
}

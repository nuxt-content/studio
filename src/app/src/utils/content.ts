// import type { ParsedContentFile } from '@nuxt/content'
import { parseMarkdown, stringifyMarkdown } from '@nuxtjs/mdc/runtime'
import { parseFrontMatter, stringifyFrontMatter } from 'remark-mdc'
import type { MDCElement, MDCRoot } from '@nuxtjs/mdc'
import { type DatabasePageItem, type DatabaseItem, ContentFileExtension } from '../types'
import { omit, pick } from './object'
import { compressTree, decompressTree } from '@nuxt/content/runtime'
import { visit } from 'unist-util-visit'
import type { Node } from 'unist'
import type { MarkdownRoot } from '@nuxt/content'
import { destr } from 'destr'
import { getFileExtension } from './file'

const reservedKeys = ['id', 'fsPath', 'stem', 'extension', '__hash__', 'path', 'body', 'meta', 'rawbody']

export function generateStemFromId(id: string) {
  return id.split('/').slice(1).join('/').split('.').slice(0, -1).join('.')
}

export function pickReservedKeysFromDocument(document: DatabaseItem) {
  return pick(document, reservedKeys)
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

  return result
}

export function isEqual(content1: string | null, content2: string | null): boolean {
  if (content1 && content2) {
    return content1.trim() === content2.trim()
  }

  return false
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

async function generateDocumentFromYAMLContent(id: string, content: string): Promise<DatabaseItem> {
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
  } as never as DatabaseItem
}

async function generateDocumentFromJSONContent(id: string, content: string): Promise<DatabaseItem> {
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
  } as never as DatabaseItem
}

async function generateDocumentFromMarkdownContent(id: string, content: string): Promise<DatabaseItem> {
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
  visit(document.body, (node: Node) => (node as MDCElement).type === 'element' && (node as MDCElement).tag === 'a', (node: Node) => {
    if ((node as MDCElement).props?.rel?.join(' ') === 'nofollow') {
      Reflect.deleteProperty((node as MDCElement).props!, 'rel')
    }
  })

  const body = document.body.type === 'root' ? compressTree(document.body) : document.body as never as MarkdownRoot

  return {
    id,
    meta: {},
    extension: ContentFileExtension.Markdown,
    stem: generateStemFromId(id),
    body: {
      ...body,
      toc: document.toc,
    },
    ...document.data,
  } as never as DatabaseItem
}

export async function generateContentFromDocument(document: DatabaseItem): Promise<string | null> {
  const [id, _hash] = document.id.split('#')
  const extension = getFileExtension(id)

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

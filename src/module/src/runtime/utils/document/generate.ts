import type { MarkdownRoot } from '@nuxt/content'
import type { MDCElement, MDCRoot } from '@nuxtjs/mdc'
import type { DatabaseItem, DatabasePageItem, MarkdownParsingOptions } from 'nuxt-studio/app'
import type { Node } from 'unist'
import { ContentFileExtension } from '../../types/content'
import { parseMarkdown } from '@nuxtjs/mdc/runtime/parser/index'
import { stringifyMarkdown } from '@nuxtjs/mdc/runtime'
import { visit } from 'unist-util-visit'
import { compressTree, decompressTree } from '@nuxt/content/runtime'
import destr from 'destr'
import { parseFrontMatter, stringifyFrontMatter } from 'remark-mdc'
import { useHostMeta } from '../../composables/useMeta'
import { addPageTypeFields, generateStemFromId, getFileExtension } from './utils'
import { removeReservedKeysFromDocument } from './schema'

export async function generateDocumentFromContent(id: string, content: string, options: MarkdownParsingOptions = { compress: true }): Promise<DatabaseItem | null> {
  const [_id, _hash] = id.split('#')
  const extension = getFileExtension(id)

  if (extension === ContentFileExtension.Markdown) {
    return await generateDocumentFromMarkdownContent(id, content, options)
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

  const document = {
    id,
    extension: getFileExtension(id),
    stem: generateStemFromId(id),
    meta: {},
    ...parsed,
  } as DatabaseItem

  if (parsed.body) {
    document.body = parsed.body
  }

  return document
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

export async function generateDocumentFromMarkdownContent(id: string, content: string, options: MarkdownParsingOptions = { compress: true }): Promise<DatabaseItem> {
  const document = await parseMarkdown(content, {
    highlight: {
      theme: useHostMeta().highlightTheme.value,
    },
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
    // TODO: handle rel custom properties
    Reflect.deleteProperty((node as MDCElement).props!, 'rel')
  })

  let body = document.body as never as MarkdownRoot
  if (options.compress && document.body.type === 'root') {
    body = compressTree(document.body)
  }

  const result: DatabaseItem = {
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

  // Do not need to calculate path meta information for data collections
  if (options.collectionType === 'page') {
    return addPageTypeFields(result)
  }

  return result
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
    // TODO: handle rel custom properties
    Reflect.deleteProperty((node as MDCElement).props!, 'rel')
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

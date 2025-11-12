import type { CollectionInfo, CollectionItemBase, MarkdownRoot, PageCollectionItemBase } from '@nuxt/content'
import { getOrderedSchemaKeys } from './collection'
import { pathMetaTransform } from './path-meta'
import type { DatabaseItem } from 'nuxt-studio/app'
import { isObjectMatch } from './object'
import { ContentFileExtension } from '../types/content'
import { parseMarkdown } from '@nuxtjs/mdc/runtime/parser/index'
import type { MDCElement } from '@nuxtjs/mdc'
import { visit } from 'unist-util-visit'
import { compressTree } from '@nuxt/content/runtime'
import destr from 'destr'
import { parseFrontMatter } from 'remark-mdc'

export function createCollectionDocument(id: string, collectionInfo: CollectionInfo, document: CollectionItemBase) {
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

export async function isDocumentMatchContent(content: string, document: DatabaseItem): Promise<boolean> {
  const generatedDocument = await generateDocumentFromContent(document.id, content) as DatabaseItem
  return isObjectMatch(generatedDocument, document)
}

export function normalizeDocument(fsPath: string, document: DatabaseItem): DatabaseItem {
  return {
    ...document,
    fsPath,
  }
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
  } as never as DatabaseItem
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
  } as never as DatabaseItem
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

  return pathMetaTransform(result as PageCollectionItemBase) as unknown as DatabaseItem
}

function generateStemFromId(id: string) {
  return id.split('/').slice(1).join('/').split('.').slice(0, -1).join('.')
}

export function getFileExtension(fsPath: string) {
  return fsPath.split('#')[0]?.split('.').pop()!.toLowerCase()
}

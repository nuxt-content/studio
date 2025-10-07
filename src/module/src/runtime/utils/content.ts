// import type { ParsedContentFile } from '@nuxt/content'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import { omit } from './object'
import type { DatabaseItem } from 'nuxt-studio/app'
import { compressTree } from '@nuxt/content/runtime'
import { parseFrontMatter } from 'remark-mdc'
import { destr } from 'destr'
import { visit } from 'unist-util-visit'
import type { Node } from 'unist'
import type { MDCElement } from '@nuxtjs/mdc'
import type { MarkdownRoot } from '@nuxt/content'

export function removeReservedKeysFromDocument(document: DatabaseItem) {
  const result = omit(document, ['id', 'stem', 'extension', '__hash__', 'path', 'body', 'meta'])
  // Default value of navigation is true, so we can safely remove it
  if (result.navigation === true) {
    Reflect.deleteProperty(result, 'navigation')
  }

  if (document.seo) {
    const seo = document.seo as Record<string, unknown>
    if (seo.title === document.title) {
      Reflect.deleteProperty(result, 'seo')
    }
    if (seo.description === document.description) {
      Reflect.deleteProperty(result, 'seo')
    }
  }

  // expand meta to the root
  for (const key in (document.meta || {})) {
    if (key !== '__hash__') {
      result[key] = (document.meta as Record<string, unknown>)[key]
    }
  }
  return result
}

// TODO: factorize with app/src/utils/content.ts
export async function generateDocumentFromContent(id: string, content: string): Promise<DatabaseItem | null> {
  const [_id, _hash] = id.split('#')
  const extension = _id!.split('.').pop()

  if (extension === 'md') {
    return await generateDocumentFromMarkdownContent(id, content)
  }

  if (extension === 'yaml' || extension === 'YML') {
    return await generateDocumentFromYAMLContent(id, content)
  }

  if (extension === 'json') {
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
    extension: 'yaml',
    stem: id.split('.').slice(0, -1).join('.'),
    meta: {},
    ...parsed,
    body: parsed.body || parsed,
  } as DatabaseItem
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

  return {
    id,
    extension: 'json',
    stem: id.split('.').slice(0, -1).join('.'),
    meta: {},
    ...parsed,
    body: parsed.body || parsed,
  } as DatabaseItem
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
    extension: 'md',
    stem: id.split('.').slice(0, -1).join('.'),
    body: {
      ...body,
      toc: document.toc,
    },
    ...document.data,
  } as DatabaseItem
}

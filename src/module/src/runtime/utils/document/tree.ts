import type { MarkdownRoot } from '@nuxt/content'
import type { DatabaseItem } from 'nuxt-studio/app'
import type { MinimarkNode, MinimarkTree } from 'minimark'
import { visit as minimarkVisit } from 'minimark'

export function sanitizeDocumentTree(document: DatabaseItem) {
  if (!document.body && (document.meta?.body as unknown as MinimarkTree)?.type === 'minimark') {
    document.body = (document.meta?.body as unknown as MinimarkTree)
    Reflect.deleteProperty(document.meta, 'body')
  }

  if ((document.body as unknown as MinimarkTree)?.type === 'minimark') {
    document.body = removeLastStylesFromTree(document.body as MarkdownRoot)

    // remove the codeblock token and convert highlighted code blocks to plain code blocks
    minimarkVisit(document.body as MinimarkTree, (node: MinimarkNode) => node[0] === 'pre', (node: MinimarkNode) => {
      const tag = node[0]
      const props = node[1] as Record<string, unknown>

      if ((props as Record<string, unknown> || {}).code) {
        // TODO: We need to make sure that there is no custom class
        Reflect.deleteProperty(props, 'className')
        return [
          tag,
          {
            ...(props || {}),
            style: props.style || undefined,
            meta: props.meta || undefined,
          },
          [
            'code',
            { __ignoreMap: '' },
            (props as Record<string, unknown> || {}).code,
          ],
        ]
      }
      return node
    })
  }

  return document
}

export function removeLastStylesFromTree(body: MarkdownRoot) {
  if (body.value[body.value.length - 1]?.[0] === 'style') {
    return { ...body, value: body.value.slice(0, -1) }
  }
  return body
}

import { Node, mergeAttributes } from '@tiptap/core'
import type { JSONContent } from '@tiptap/vue-3'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { Node as ProseMirrorNode, NodeType } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import TiptapExtensionSpanStyle from '../../../components/tiptap/extension/TiptapExtensionSpanStyle.vue'

export interface SpanStyleAttrs {
  style?: string | null
  class?: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    SpanStyle: {
      /**
       * Wrap selection (or insert empty) with span-style node
       */
      setSpanStyle: (attributes?: SpanStyleAttrs) => ReturnType
      /**
       * Update attributes on current span-style node
       */
      updateSpanStyle: (attributes?: SpanStyleAttrs) => ReturnType
      /**
       * Remove the current span-style node (unwrap content)
       */
      unsetSpanStyle: () => ReturnType
    }
  }
}

const sanitizeAttributes = (attributes?: SpanStyleAttrs) => {
  const cleaned: Record<string, string> = {}
  if (attributes?.style?.trim()) cleaned.style = attributes.style.trim()
  if (attributes?.class?.trim()) cleaned.class = attributes.class.trim()
  return cleaned
}

function unwrapCurrentSpan(state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, type?: NodeType) {
  const { from } = state.selection
  let found: { pos: number, node: ProseMirrorNode } | null = null
  state.doc.nodesBetween(from, from, (node: ProseMirrorNode, pos: number) => {
    if (node.type === type) {
      found = { node, pos }
      return false
    }
    return undefined
  })

  if (!found) return false
  const foundNode = found as { pos: number, node: ProseMirrorNode }
  const tr = state.tr.replaceWith(
    foundNode.pos,
    foundNode.pos + foundNode.node.nodeSize,
    foundNode.node.content,
  )
  if (dispatch) dispatch(tr)
  return true
}

export const SpanStyle = Node.create<SpanStyleAttrs>({
  name: 'span-style',
  inline: true,
  group: 'inline',
  content: 'text*',

  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
      },
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'span:not([data-type])' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes }
    if (!attrs.style) delete attrs.style
    if (!attrs.class) delete attrs.class
    return ['span', mergeAttributes(attrs), 0]
  },

  addCommands() {
    return {
      setSpanStyle:
        attributes =>
          ({ state, chain }) => {
            const cleaned = sanitizeAttributes(attributes)
            const { from, to, empty } = state.selection

            // If empty selection, insert empty span ready for typing
            if (empty) {
              return chain()
                .insertContent({
                  type: this.name,
                  attrs: cleaned,
                  content: [{ type: 'text', text: '' }],
                })
                .focus()
                .run()
            }

            // Capture selected slice to preserve marks/content
            const slice = state.doc.slice(from, to)
            const content = slice.content.toJSON() as JSONContent[]

            return chain()
              .insertContentAt({ from, to }, {
                type: this.name,
                attrs: cleaned,
                content,
              })
              .focus()
              .run()
          },
      updateSpanStyle:
        attributes =>
          ({ chain }) =>
            chain()
              .updateAttributes(this.name, sanitizeAttributes(attributes))
              .run(),
      unsetSpanStyle:
        () =>
          ({ state, dispatch }) =>
            unwrapCurrentSpan(state, dispatch, this.type),
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(TiptapExtensionSpanStyle)
  },
})

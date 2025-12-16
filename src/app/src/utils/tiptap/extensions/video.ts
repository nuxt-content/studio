import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TiptapExtensionVideo from '../../../components/tiptap/extension/TiptapExtensionVideo.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    Video: {
      /**
       * Add video element
       */
      addVideo: () => ReturnType
    }
  }
}

// https://www.codemzy.com/blog/tiptap-video-embed-extension
export const Video = Node.create({
  name: 'video',
  priority: 1000,
  group: 'block',
  selectable: false,
  inline: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      key: {
        default: '',
      },
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      props: {
        parseHTML(element) {
          return JSON.parse(element.getAttribute('props') || '{}')
        },
        default: null,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'video' })
    return [
      'div',
      mergedAttributes,
    ]
  },

  addCommands() {
    return {
      addVideo: () => ({ state, chain }) => {
        const { selection } = state
        const range = { from: selection.from, to: selection.to }
        const key = `${Date.now() % 1e6}-${Number.parseInt(String(Math.random() * 1e3))}`

        return chain()
          .insertContentAt(range, {
            type: this.name,
            attrs: { tag: 'video', key },
          })
          .run()
      },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(TiptapExtensionVideo)
  },
})

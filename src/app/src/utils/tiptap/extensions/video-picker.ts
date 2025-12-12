import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TiptapExtensionVideoPicker from '../../../components/tiptap/extension/TiptapExtensionVideoPicker.vue'

declare module '@tiptap/vue-3' {
  interface Commands<ReturnType> {
    videoPicker: {
      insertVideoPicker: () => ReturnType
    }
  }
}

export const VideoPicker = Node.create({
  name: 'video-picker',
  group: 'block',
  atom: true,
  addAttributes() {
    return {}
  },
  parseHTML() {
    return [{
      tag: 'div[data-type="video-picker"]',
    }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'video-picker' })]
  },
  addNodeView() {
    return VueNodeViewRenderer(TiptapExtensionVideoPicker)
  },
  addCommands() {
    return {
      insertVideoPicker: () => ({ commands }) => {
        return commands.insertContent({ type: this.name })
      },
    }
  },
})

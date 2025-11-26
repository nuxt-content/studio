import { default as TiptapCodeBlock } from '@tiptap/extension-code-block'
import { Attributes, VueNodeViewRenderer } from '@tiptap/vue-3'
import TiptapExtensionCodeBlock from '../../../components/tiptap/extension/TiptapExtensionCodeBlock.vue'

export const CodeBlock = TiptapCodeBlock.extend({
  addNodeView() {
    return VueNodeViewRenderer(TiptapExtensionCodeBlock as any)
  },
  addAttributes() {
    const parentAttributes: Attributes = this.parent!()
    parentAttributes.language!.default = 'js'
    return {
      ...parentAttributes,
      filename: {
        default: null,
      },
    }
  }
})

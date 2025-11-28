import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TiptapExtensionSlot from '../../../components/tiptap/extension/TiptapExtensionSlot.vue'

export interface ElementOptions {
  HTMLAttributes: Record<string, unknown>
  nestable: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    Slot: {
      /**
       * Override backspace command
       */
      handleSlotBackspace: () => ReturnType
    }
  }
}

export const Slot = Node.create<ElementOptions>({
  name: 'slot',
  priority: 1000,
  group: 'block',
  content: 'block+',
  selectable: false,
  inline: false,
  isolating: true,

  addOptions() {
    return {
      tag: 'div',
      nestable: false,
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      name: {
        default: 'default',
      },
      props: {
        parseHTML(element) {
          return JSON.parse(element.getAttribute('props') || '{}')
        },
        default: {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="Slot"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'Slot' }),
      0,
    ]
  },

  addCommands() {
    return {
      handleSlotBackspace: () => () => {
        return false
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Backspace': ({ editor }) => editor.commands.handleSlotBackspace(),
      'Shift-Backspace': ({ editor }) => editor.commands.handleSlotBackspace(),
      'Mod-Backspace': ({ editor }) => editor.commands.handleSlotBackspace(),
      'Alt-Backspace': ({ editor }) => editor.commands.handleSlotBackspace(),
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(TiptapExtensionSlot)
  },
})

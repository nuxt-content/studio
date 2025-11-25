<script setup lang="ts">
import { upperFirst, titleCase } from 'scule'
import type { DropdownMenuItem } from '@nuxt/ui/runtime/components/DropdownMenu.vue.d.ts'
import { mapEditorItems } from '@nuxt/ui/utils/editor'
// import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji'
import { ImagePicker } from '../../utils/tiptap/extensions/image-picker'
import { ref, watch, computed } from 'vue'
import type { Editor, JSONContent } from '@tiptap/vue-3'
import type { PropType } from 'vue'
import type { MDCRoot } from '@nuxtjs/mdc'
import type { MarkdownRoot } from '@nuxt/content'
import { useStudio } from '../../composables/useStudio'
import { useStudioState } from '../../composables/useStudioState'
import { mdcToTiptap } from '../../utils/tiptap/mdcToTiptap'
import { tiptapToMDC } from '../../utils/tiptap/tiptapToMdc'
import type { DraftItem, DatabasePageItem } from '../../types'
import { omit } from '../../utils/object'
import { Element } from '../../utils/tiptap/extensions/element'
import { Slot } from '../../utils/tiptap/extensions/slot'
import { standardToolbarItems, standardSuggestionItems, standardElements, headingItems, listItems, codeBlockItem } from '../../utils/tiptap/editor'

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
})

const document = defineModel<DatabasePageItem>()

// const content = ref<string>('')
const tiptapJSON = ref<JSONContent>()

// Debug
const currentTiptap = ref<JSONContent>()
const currentMDC = ref<{ body: MDCRoot, data: Record<string, unknown> }>()
const currentContent = ref<string>()

const { host } = useStudio()
const { preferences } = useStudioState()

const reservedKeys = ['id', 'fsPath', 'stem', 'extension', '__hash__', 'path', 'body', 'meta', 'rawbody']
const debug = computed(() => preferences.value.debug)

// Trigger on document changes
watch(() => document.value?.id + '-' + props.draftItem.version, async () => {
  if (document.value) {
    setEditorJSON(document.value)
  }
}, { immediate: true })

async function setEditorJSON(document: DatabasePageItem) {
  tiptapJSON.value = mdcToTiptap(document.body as unknown as MDCRoot, '')

  // Debug: Capture initial state
  if (debug.value && !currentMDC.value) {
    const generateContentFromDocument = host.document.generate.contentFromDocument
    const generatedContent = await generateContentFromDocument(document) || ''
    currentMDC.value = {
      body: document.body as unknown as MDCRoot,
      data: omit(document, reservedKeys) as Record<string, unknown>,
    }
    currentContent.value = generatedContent
    currentTiptap.value = JSON.parse(JSON.stringify(tiptapJSON.value))
  }

  // TODO: conflicts detection
  // isAutomaticFormattingDetected.value = false
  // if (props.draftItem.original && props.draftItem.remoteFile?.content) {
  //   const localOriginal = await generateContentFromDocument(props.draftItem.original as DatabaseItem) as string
  //   const remoteOriginal = props.draftItem.remoteFile.encoding === 'base64' ? fromBase64ToUTF8(props.draftItem.remoteFile.content!) : props.draftItem.remoteFile.content!

  //   isAutomaticFormattingDetected.value = !areContentEqual(localOriginal, remoteOriginal)
  //   if (isAutomaticFormattingDetected.value) {
  //     originalContent.value = remoteOriginal
  //     formattedContent.value = localOriginal
  //   }
  // }
}

// TipTap to Markdown
watch(tiptapJSON, async (json) => {
  const mdc = await tiptapToMDC(json!)

  const updatedDocument: DatabasePageItem = {
    ...document.value!,
    ...mdc.data,
    body: mdc.body as unknown as MarkdownRoot,
  }

  document.value = updatedDocument

  // Debug: Capture current state
  if (debug.value) {
    currentTiptap.value = JSON.parse(JSON.stringify(tiptapJSON.value))
    currentMDC.value = {
      body: updatedDocument.body as unknown as MDCRoot,
      data: omit(updatedDocument, reservedKeys) as Record<string, unknown>,
    }
    currentContent.value = await host.document.generate.contentFromDocument(updatedDocument) as string
  }

  // const generatedContent = await host.document.generate.contentFromDocument(updatedDocument
})

const componentItems = computed(() => {
  return host.meta.getComponents().map(component => ({
    kind: component.name,
    type: undefined as never,
    label: titleCase(component.name),
    icon: standardElements[component.name]?.icon || 'i-lucide-box',
  }))
})

const customHandlers = computed(() => ({
  image: {
    canExecute: (editor: Editor) => editor.can().insertContent({ type: 'image-picker' }),
    execute: (editor: Editor) => editor.chain().focus().insertContent({ type: 'image-picker' }),
    isActive: (editor: Editor) => editor.isActive('image-picker'),
    isDisabled: undefined,
  },
  ...Object.fromEntries(
    componentItems.value.map(item => [
      item.kind,
      {
        canExecute: (editor: Editor) => editor.can().setElement(item.kind, 'default'),
        execute: (editor: Editor) => editor.chain().focus().setElement(item.kind, 'default'),
        isActive: (editor: Editor) => editor.isActive(item.kind),
        isDisabled: undefined,
      },
    ]),
  ),
}))

const suggestionItems = computed(() => [
  ...standardSuggestionItems,
  [
    {
      type: 'label',
      label: 'Components',
    },
    ...componentItems.value,
  ],
])

const selectedNode = ref<JSONContent | null>(null)

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// const shouldShowBubbleMenu = ({ state, view }: any) => {
//   if (!view.hasFocus()) {
//     return false
//   }
//   const { selection } = state
//   const { empty } = selection
//   return !empty
// }

const dragHandleItems = (editor: Editor): DropdownMenuItem[][] => {
  if (!selectedNode.value) {
    return []
  }

  return mapEditorItems(editor, [
    [
      {
        type: 'label',
        label: upperFirst(selectedNode.value.node.type),
      },
      {
        label: 'Turn into',
        icon: 'i-lucide-repeat-2',
        children: [
          { kind: 'paragraph', label: 'Paragraph', icon: 'i-lucide-type' },
          ...headingItems,
          ...listItems,
          ...codeBlockItem,
        ],
      },
      {
        kind: 'clearFormatting',
        pos: selectedNode.value?.pos,
        label: 'Reset formatting',
        icon: 'i-lucide-rotate-ccw',
      },
    ],
    [
      {
        kind: 'duplicate',
        pos: selectedNode.value?.pos,
        label: 'Duplicate',
        icon: 'i-lucide-copy',
      },
      {
        label: 'Copy to clipboard',
        icon: 'i-lucide-clipboard',
        onSelect: async () => {
          if (!selectedNode.value) return

          const pos = selectedNode.value.pos
          const node = editor.state.doc.nodeAt(pos)
          if (node) {
            await navigator.clipboard.writeText(node.textContent)
          }
        },
      },
    ],
    [
      {
        kind: 'moveUp',
        pos: selectedNode.value?.pos,
        label: 'Move up',
        icon: 'i-lucide-arrow-up',
      },
      {
        kind: 'moveDown',
        pos: selectedNode.value?.pos,
        label: 'Move down',
        icon: 'i-lucide-arrow-down',
      },
    ],
    [
      {
        kind: 'delete',
        pos: selectedNode.value?.pos,
        label: 'Delete',
        icon: 'i-lucide-trash',
      },
    ],
  ],
  customHandlers.value,
  ) as DropdownMenuItem[][]
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Debug Panel -->
    <ContentEditorTipTapDebug
      v-if="preferences.debug"
      :current-tiptap="currentTiptap"
      :current-mdc="currentMDC"
      :current-content="currentContent"
    />
    <UEditor
      v-slot="{ editor }"
      v-model="tiptapJSON"
      class="my-4"
      content-type="json"
      :handlers="customHandlers"
      :extensions="[ImagePicker, Element, Slot]"
      placeholder="Write, type '/' for commands..."
    >
      <UEditorToolbar
        :editor="editor"
        :items="standardToolbarItems"
        layout="bubble"
      >
        <!-- :should-show="shouldShowBubbleMenu" -->
        <template #link>
          <EditorLinkPopover :editor="editor" />
        </template>
      </UEditorToolbar>

      <!-- <UEditorToolbar /> for image -->

      <UEditorDragHandle
        v-slot="{ ui }"
        :editor="editor"
        @node-change="selectedNode = $event"
      >
        <UDropdownMenu
          v-slot="{ open }"
          :modal="false"
          :items="dragHandleItems(editor)"
          :content="{ side: 'left' }"
          :ui="{ content: 'w-48', label: 'text-xs' }"
          @update:open="editor.chain().setMeta('lockDragHandle', $event).run()"
        >
          <UButton
            color="neutral"
            variant="ghost"
            active-variant="soft"
            size="sm"
            icon="i-lucide-grip-vertical"
            :active="open"
            :class="ui.handle()"
          />
        </UDropdownMenu>
      </UEditorDragHandle>

      <UEditorSuggestionMenu
        :editor="editor"
        :items="suggestionItems"
      />
      <!-- :items="mentionItems" -->
      <!-- <UEditorEmojiMenu
        :editor="editor"
        :items="emojiItems"
      /> -->
    </UEditor>
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui/runtime/components/DropdownMenu.vue.d.ts'
import type { EditorSuggestionMenuItem } from '@nuxt/ui/runtime/components/EditorSuggestionMenu.vue.d.ts'
// import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji'
import type { PropType } from 'vue'
import type { Editor, JSONContent } from '@tiptap/vue-3'
import type { MDCRoot, Toc } from '@nuxtjs/mdc'
import { generateToc } from '@nuxtjs/mdc/dist/runtime/parser/toc'
import type { DraftItem, DatabasePageItem } from '../../types'
import type { MarkdownRoot } from '@nuxt/content'
import type { EditorCustomHandlers } from '@nuxt/ui'
import { ref, watch, computed } from 'vue'
import { titleCase } from 'scule'
import { useI18n } from 'vue-i18n'
import { useStudio } from '../../composables/useStudio'
import { useStudioState } from '../../composables/useStudioState'
import { mdcToTiptap } from '../../utils/tiptap/mdcToTiptap'
import { tiptapToMDC } from '../../utils/tiptap/tiptapToMdc'
import { getStandardToolbarItems, getStandardSuggestionItems, standardNuxtUIComponents, computeStandardDragActions, removeLastEmptyParagraph } from '../../utils/tiptap/editor'
import { Element } from '../../utils/tiptap/extensions/element'
import { ImagePicker } from '../../utils/tiptap/extensions/image-picker'
import { Slot } from '../../utils/tiptap/extensions/slot'
import { Frontmatter } from '../../utils/tiptap/extensions/frontmatter'
import { CodeBlock } from '../../utils/tiptap/extensions/code-block'
import { InlineElement } from '../../utils/tiptap/extensions/inline-element'
import { compressTree } from '@nuxt/content/runtime'

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
})

const document = defineModel<DatabasePageItem>()

const { host } = useStudio()
const { preferences } = useStudioState()
const { t } = useI18n()

const tiptapJSON = ref<JSONContent>()

const removeReservedKeys = host.document.utils.removeReservedKeys

// Debug
const debug = computed(() => preferences.value.debug)
const currentTiptap = ref<JSONContent>()
const currentMDC = ref<{ body: MDCRoot, data: Record<string, unknown> }>()
const currentContent = ref<string>()

// Trigger on document changes
watch(() => `${document.value?.id}-${props.draftItem.version}-${props.draftItem.status}`, async () => {
  const frontmatterJson = removeReservedKeys(document.value!)
  const newTiptapJSON = mdcToTiptap(document.value?.body as unknown as MDCRoot, frontmatterJson)

  if (!tiptapJSON.value || JSON.stringify(newTiptapJSON) !== JSON.stringify(removeLastEmptyParagraph(tiptapJSON.value))) {
    tiptapJSON.value = newTiptapJSON

    if (debug.value && !currentMDC.value) {
      const generateContentFromDocument = host.document.generate.contentFromDocument
      const generatedContent = await generateContentFromDocument(document.value!) || ''
      currentMDC.value = {
        body: document.value!.body as unknown as MDCRoot,
        data: frontmatterJson,
      }
      currentContent.value = generatedContent
      currentTiptap.value = JSON.parse(JSON.stringify(tiptapJSON.value))
    }
  }
}, { immediate: true })

// TipTap to Markdown
watch(tiptapJSON, async (json) => {
  const cleanedTiptap = removeLastEmptyParagraph(json!)

  const { body, data } = await tiptapToMDC(cleanedTiptap, {
    highlightTheme: host.meta.getHighlightTheme(),
  })

  const compressedBody: MarkdownRoot = compressTree(body)
  const toc: Toc = generateToc(body, { searchDepth: 2, depth: 2 } as Toc)

  const updatedDocument: DatabasePageItem = {
    ...document.value!,
    ...data,
    body: {
      ...compressedBody,
      toc,
    } as MarkdownRoot,
  }

  document.value = updatedDocument

  // Debug: Capture current state
  if (debug.value) {
    currentTiptap.value = cleanedTiptap
    currentMDC.value = {
      body,
      data: removeReservedKeys(updatedDocument),
    }
    currentContent.value = await host.document.generate.contentFromDocument(updatedDocument) as string
  }
})

const componentItems = computed(() => {
  return host.meta.getComponents().map(component => ({
    kind: component.name,
    type: undefined as never,
    label: titleCase(component.name),
    icon: standardNuxtUIComponents[component.name]?.icon || 'i-lucide-box',
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
}) satisfies EditorCustomHandlers)

const suggestionItems = computed(() => [
  ...getStandardSuggestionItems(t),
  [
    {
      type: 'label',
      label: t('studio.tiptap.editor.components'),
    },
    ...componentItems.value,
  ],
] satisfies EditorSuggestionMenuItem[][])

const selectedNode = ref<JSONContent | null>(null)
const dragHandleItems = (editor: Editor): DropdownMenuItem[][] => {
  if (!selectedNode.value) {
    return []
  }

  return computeStandardDragActions(editor, selectedNode.value, t)
}

const toolbarItems = computed(() => getStandardToolbarItems(t))
</script>

<template>
  <div class="h-full flex flex-col">
    <ContentEditorTipTapDebug
      v-if="preferences.debug"
      :current-tiptap="currentTiptap"
      :current-mdc="currentMDC"
      :current-content="currentContent"
    />

    <UEditor
      v-slot="{ editor }"
      v-model="tiptapJSON"
      class="mb-4 ml-1"
      content-type="json"
      :handlers="customHandlers"
      :starter-kit="{
        codeBlock: false,
        link: {
          HTMLAttributes: {
            target: null,
          },
        },
      }"
      :extensions="[
        Frontmatter,
        ImagePicker,
        Element,
        InlineElement,
        Slot,
        CodeBlock,
      ]"
      :placeholder="$t('studio.tiptap.editor.placeholder')"
    >
      <UEditorToolbar
        :editor="editor"
        :items="toolbarItems"
        layout="bubble"
      >
        <template #link>
          <TiptapLinkPopover :editor="editor" />
        </template>
      </UEditorToolbar>

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
    </UEditor>
  </div>
</template>

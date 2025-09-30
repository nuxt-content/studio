<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import type { DatabasePageItem, DraftItem } from '../../../../types'
import { DraftStatus } from '../../../../types/draft'
import type { PropType } from 'vue'
import { setupMonaco, setupSuggestion, type Editor } from '../../../../utils/monaco/index'
import { generateContentFromDocument, generateDocumentFromContent, pickReservedKeysFromDocument } from '../../../../utils/content'
import { useStudio } from '../../../../composables/useStudio'

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
  readOnly: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const document = defineModel<DatabasePageItem>()
const { mediaTree, host } = useStudio()

const editor = shallowRef<Editor.IStandaloneCodeEditor | null>(null)
const editorRef = ref()
const content = ref<string>('')
const currentDocumentId = ref<string | null>(null)
const localStatus = ref<DraftStatus>(props.draftItem.status)

// Trigger on action events
watch(() => props.draftItem.status, (newStatus) => {
  if (editor.value && newStatus !== localStatus.value) {
    localStatus.value = newStatus
    setContent(props.draftItem.modified as DatabasePageItem)
  }
})

// Trigger on document changes
watch(() => document.value?.id, async () => {
  if (document.value?.body) {
    setContent(document.value)
  }
}, { immediate: true })

onMounted(async () => {
  const monaco = await setupMonaco()
  setupSuggestion(monaco.monaco, host.meta.components(), mediaTree.root.value)

  // create a Monaco editor instance
  editor.value = monaco.createEditor(editorRef.value, {
    readOnly: props.readOnly,
    scrollbar: props.readOnly
      ? {
          vertical: 'hidden',
          horizontal: 'hidden',
          handleMouseWheel: false,
        }
      : undefined,
  })
  editor.value.onDidChangeModelContent(() => {
    if (props.readOnly) {
      return
    }

    // Do not trigger model updates if the document id has changed
    if (currentDocumentId.value !== document.value?.id) {
      return
    }

    const newContent = editor.value!.getModel()!.getValue() || ''
    if (content.value === newContent) {
      return
    }

    content.value = newContent

    generateDocumentFromContent(document.value!.id, content.value).then((doc) => {
      // Update local status
      localStatus.value = DraftStatus.Updated

      // Update document
      document.value = {
        ...pickReservedKeysFromDocument(props.draftItem.original as DatabasePageItem || document.value!),
        ...doc,
      } as DatabasePageItem
    })
  })

  // create and attach a model to the editor
  editor.value.setModel(monaco.editor.createModel(content.value, 'mdc'))
})

function setContent(document: DatabasePageItem) {
  generateContentFromDocument(document).then((md) => {
    content.value = md || ''

    if (editor.value && editor.value.getModel()?.getValue() !== md) {
      // Keep the cursor position
      const position = editor.value.getPosition()
      editor.value.getModel()?.setValue(md || '')
      // Restore the cursor position
      position && editor.value.setPosition(position)
    }

    currentDocumentId.value = document.id
  })
}
</script>

<template>
  <div
    ref="editorRef"
    class="h-full -m-4"
  />
</template>

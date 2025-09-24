<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import type { DatabasePageItem, DraftItem } from '../../../../types'
import type { PropType } from 'vue'
import { setupMonaco, type Editor } from '../../../../utils/monaco'
import { generateContentFromDocument, generateDocumentFromContent, pickReservedKeysFromDocument } from '../../../../utils/content'

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
})

const document = defineModel<DatabasePageItem>()

const editor = shallowRef<Editor.IStandaloneCodeEditor | null>(null)
const editorRef = ref()
const content = ref<string>('')
const currentDocumentId = ref<string | null>(null)

// Trigger on action events
watch(() => props.draftItem.status, () => {
  if (editor.value) {
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

  // create a Monaco editor instance
  editor.value = monaco.createEditor(editorRef.value)
  editor.value.onDidChangeModelContent(() => {
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
      editor.value.getModel()?.setValue(md || '')
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

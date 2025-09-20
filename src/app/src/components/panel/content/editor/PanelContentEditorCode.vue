<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import type { DatabasePageItem } from '../../../../types'
import { parseMarkdown, stringifyMarkdown } from '@nuxtjs/mdc/runtime'
import { decompressTree, compressTree } from '@nuxt/content/runtime'
import type { MDCRoot } from '@nuxtjs/mdc'
import type { MarkdownRoot } from '@nuxt/content'
import { removeReservedKeysFromDocument } from '../../../../utils/content'
import { setupMonaco, type Editor } from '../../../../utils/monaco'

const document = defineModel<DatabasePageItem>()

const editor = shallowRef<Editor.IStandaloneCodeEditor | null>(null)
const editorRef = ref()
const content = ref<string>('')

watch(() => document.value?.id, async () => {
  if (document.value?.body) {
    const tree = document.value.body.type === 'minimark' ? decompressTree(document.value.body) : (document.value.body as unknown as MDCRoot)
    const data = removeReservedKeysFromDocument(document.value)
    stringifyMarkdown(tree, data).then((md) => {
      content.value = md || ''

      if (editor.value) {
        editor.value.getModel()?.setValue(md || '')
      }
    })
  }
}, { immediate: true })

onMounted(async () => {
  const monaco = await setupMonaco()

  // create a Monaco editor instance
  editor.value = monaco.createEditor(editorRef.value)
  editor.value.onDidChangeModelContent(() => {
    content.value = editor.value!.getModel()!.getValue() || ''
    parseMarkdown(content.value).then((tree) => {
      document.value = {
        ...document.value,
        body: tree.body.type === 'root' ? compressTree(tree.body) : tree.body as never as MarkdownRoot,
        ...tree.data,
      } as DatabasePageItem
    })
  })

  // create and attach a model to the editor
  editor.value.setModel(monaco.editor.createModel(content.value, 'mdc'))
})
</script>

<template>
  <div
    ref="editorRef"
    class="h-full -m-4"
  />
</template>

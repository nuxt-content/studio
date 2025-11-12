<script setup lang="ts">
import { ref, watch } from 'vue'
import type { DatabasePageItem } from '../../types'
import { parseMarkdown, stringifyMarkdown } from '@nuxtjs/mdc/runtime'
import { decompressTree, compressTree } from '@nuxt/content/runtime'
import type { MDCRoot } from '@nuxtjs/mdc'
import type { MarkdownRoot } from '@nuxt/content'
import { useStudio } from '../../composables/useStudio'

const { host } = useStudio()
const document = defineModel<DatabasePageItem>()
const content = ref('')

watch(() => document.value?.id, async () => {
  if (document.value?.body) {
    // @ts-expect-error todo fix MarkdownRoot/MDCRoot conversion in MDC module
    const tree = document.value.body.type === 'minimark' ? decompressTree(document.value.body) : (document.value.body as MDCRoot)
    const data = host.document.utils.removeReservedKeys(document.value)
    stringifyMarkdown(tree, data).then((md) => {
      content.value = md || ''
    })
  }
}, { immediate: true })

watch(content, (newContent) => {
  parseMarkdown(newContent).then((tree) => {
    document.value = {
      ...document.value,
      body: tree.body.type === 'root' ? compressTree(tree.body) : tree.body as never as MarkdownRoot,
      ...tree.data,
    } as DatabasePageItem
  })
})
</script>

<template>
  <UTextarea
    v-model="content"
    class="h-full w-full"
    :ui="{ base: 'h-full w-full' }"
  />
</template>

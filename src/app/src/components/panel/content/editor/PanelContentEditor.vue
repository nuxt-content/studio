<script setup lang="ts">
import { computed, type PropType, toRaw } from 'vue'
import { decompressTree } from '@nuxt/content/runtime'
import type { MarkdownRoot } from '@nuxt/content'
import type { DatabasePageItem } from '../../../../types'
import { useStudio } from '../../../../composables/useStudio'

const props = defineProps({
  dbItem: {
    type: Object as PropType<DatabasePageItem>,
    required: true,
  },
})

const { draftFiles } = useStudio()

const document = computed<DatabasePageItem>({
  get() {
    if (!props.dbItem) {
      return {}
    }

    let result: DatabasePageItem
    // TODO: check mdcRoot and markdownRoot types with Ahad
    if (props.dbItem.body?.type === 'minimark') {
      result = {
        ...props.dbItem,
        body: decompressTree(props.dbItem?.body) as unknown as MarkdownRoot,
      }
    }
    else {
      result = props.dbItem
    }

    return result
  },
  set(value) {
    draftFiles.upsert(props.dbItem.id, {
      ...toRaw(document.value as DatabasePageItem),
      ...toRaw(value),
    })
  },
})
</script>

<template>
  <div class="h-full">
    <PanelContentEditorText v-model="(document as DatabasePageItem)" />
  </div>
  <!-- <MDCEditorAST v-model="document" /> -->
</template>

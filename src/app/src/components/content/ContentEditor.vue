<script setup lang="ts">
import { computed, type PropType, toRaw } from 'vue'
import { decompressTree } from '@nuxt/content/runtime'
import type { MarkdownRoot } from '@nuxt/content'
import { DraftStatus, type DatabasePageItem, type DraftItem } from '../../types'
import { useStudio } from '../../composables/useStudio'

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

const { documentTree } = useStudio()

const document = computed<DatabasePageItem>({
  get() {
    if (!props.draftItem) {
      return {} as DatabasePageItem
    }

    if (props.draftItem.status === DraftStatus.Deleted) {
      return props.draftItem.original as DatabasePageItem
    }

    const dbItem = props.draftItem.modified as DatabasePageItem

    let result: DatabasePageItem
    if (dbItem.body?.type === 'minimark') {
      result = {
        ...props.draftItem.modified as DatabasePageItem,
        // @ts-expect-error todo fix MarkdownRoot/MDCRoot conversion in MDC module
        body: decompressTree(dbItem.body) as MarkdownRoot,
      }
    }
    else {
      result = dbItem
    }

    return result
  },
  set(value) {
    if (props.readOnly) {
      return
    }

    documentTree.draft.update(props.draftItem.id, {
      ...toRaw(document.value as DatabasePageItem),
      ...toRaw(value),
    })
  },
})
</script>

<template>
  <div class="h-full">
    <ContentEditorCode
      v-model="document"
      :draft-item="draftItem"
      :read-only="readOnly"
    />
  </div>
  <!-- <MDCEditorAST v-model="document" /> -->
</template>

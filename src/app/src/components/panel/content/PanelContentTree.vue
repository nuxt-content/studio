<script setup lang="ts">
import type { TreeItem } from '../../../types'
import type { PropType } from 'vue'
import { useStudio } from '../../../composables/useStudio'

const { tree: treeApi } = useStudio()

defineProps({
  type: {
    type: String as PropType<'directory' | 'file'>,
    required: true,
  },
  tree: {
    type: Array as PropType<TreeItem[]>,
    default: () => [],
  },
  currentTreeItem: {
    type: Object as PropType<TreeItem | null>,
    default: null,
  },
  parentItem: {
    type: Object as PropType<TreeItem | null>,
    default: null,
  },
})
</script>

<template>
  <div class="flex flex-col @container">
    <ul
      ref="container"
      class="grid grid-cols-1 @sm:grid-cols-2 @md:grid-cols-3 @4xl:grid-cols-4 @7xl:grid-cols-6 gap-4"
    >
      <li v-if="!!parentItem">
        <!-- parent card -->
        <FileCard
          :file="parentItem!"
          @click="treeApi.selectItem(parentItem?.id ? parentItem : null)"
        />
      </li>
      <li
        v-for="(item, index) in tree"
        :key="`${item.path}-${index}`"
      >
        <FileCard
          :file="item"
          @click="treeApi.selectItem(item)"
        />
      </li>
    </ul>
  </div>
</template>

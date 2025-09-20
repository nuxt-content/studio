<script setup lang="ts">
import type { TreeItem } from '../../../types'
import type { PropType } from 'vue'
import { useStudio } from '../../../composables/useStudio'

const { tree: treeApi, context } = useStudio()

defineProps({
  type: {
    type: String as PropType<'directory' | 'file'>,
    required: true,
  },
  tree: {
    type: Array as PropType<TreeItem[]>,
    default: () => [],
  },
  showCreationForm: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div class="flex flex-col @container">
    <ul
      ref="container"
      class="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-4 @7xl:grid-cols-6 gap-4"
    >
      <li v-if="showCreationForm">
        <ItemCardForm
          :parent-item="treeApi.currentItem.value"
          :action-id="context.actionInProgress.value!"
        />
      </li>
      <li
        v-for="(item, index) in tree"
        :key="`${item.id}-${index}`"
      >
        <ItemCard
          :item="item"
          @click="treeApi.selectItem(item)"
        />
      </li>
    </ul>
  </div>
</template>

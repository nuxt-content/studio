<script setup lang="ts">
import { StudioFeature, type TreeItem } from '../../../types'
import { computed, type PropType } from 'vue'
import { useStudio } from '../../../composables/useStudio'

const { documentTree, mediaTree, context } = useStudio()

const treeApi = computed(() => context.feature.value === StudioFeature.Content ? documentTree : mediaTree)

const props = defineProps({
  type: {
    type: String as PropType<'directory' | 'file'>,
    required: true,
  },
  tree: {
    type: Array as PropType<TreeItem[]>,
    default: () => [],
  },
  showForm: {
    type: Boolean,
    default: false,
  },
})

const filteredTree = computed(() => {
  if (!context.actionInProgress.value?.item) return props.tree

  return props.tree.filter(item => item.id !== context.actionInProgress.value!.item?.id)
})
</script>

<template>
  <div class="flex flex-col @container">
    <ul
      ref="container"
      class="grid grid-cols-1 @sm:grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-4 @7xl:grid-cols-6 gap-4"
    >
      <li v-if="showForm">
        <ItemCardForm
          :parent-item="treeApi.currentItem.value"
          :action-id="context.actionInProgress.value!.id"
          :renamed-item="context.actionInProgress.value!.item"
        />
      </li>
      <li
        v-for="(item, index) in filteredTree"
        :key="`${item.id}-${index}`"
      >
        <ItemCard
          :item="item"
          @click="treeApi.select(item)"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { StudioFeature } from '../../../types'
import { computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'

const { context, documentTree, mediaTree } = useStudio()

const tree = computed(() => context.feature.value === StudioFeature.Content ? documentTree : mediaTree)
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <ItemBreadcrumb
      :current-item="tree.currentItem.value"
      :tree="tree.root.value"
    />
    <ItemActionsToolbar
      :item="tree.currentItem.value"
    />
  </div>
</template>

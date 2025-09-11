<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'

const { tree } = useStudio()

const folderTree = computed(() => (tree.current.value || []).filter(f => f.type === 'directory'))
const fileTree = computed(() => (tree.current.value || []).filter(f => f.type === 'file'))
</script>

<template>
  <!-- TODO: TO check => Use flex-col-reverse to fix an issue of z-index with popover in absolute position (actions dropdwon) -->
  <div class="flex flex-col">
    <PanelContentTree
      v-if="folderTree?.length > 0 || tree.currentItem.value?.type === 'directory'"
      class="mb-4"
      :tree="folderTree"
      :current-tree-item="tree.currentItem.value"
      :parent-item="tree.parentItem.value"
      type="directory"
    />
    <PanelContentTree
      v-if="fileTree?.length > 0"
      :tree="fileTree"
      :current-tree-item="tree.currentItem.value"
      type="file"
    />
  </div>
</template>

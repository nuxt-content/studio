<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'
import type { DatabasePageItem } from '../../../types'

const { tree, draftFiles } = useStudio()

const folderTree = computed(() => (tree.current.value || []).filter(f => f.type === 'directory'))
const fileTree = computed(() => (tree.current.value || []).filter(f => f.type === 'file'))
</script>

<template>
  <!-- TODO: TO check => Use flex-col-reverse to fix an issue of z-index with popover in absolute position (actions dropdwon) -->
  <div class="flex flex-col h-full">
    <PanelContentEditor
      v-if="tree.currentItem.value?.type === 'file' && draftFiles.current.value"
      :db-item="draftFiles.current.value.document as DatabasePageItem"
    />
    <template v-else>
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
    </template>
  </div>
</template>

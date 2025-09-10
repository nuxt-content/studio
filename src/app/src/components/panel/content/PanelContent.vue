<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'

const { tree } = useStudio()

const folderTree = computed(() => (tree.current.value || []).filter(f => f.type === 'directory'))
const fileTree = computed(() => (tree.current.value || []).filter(f => f.type === 'file'))
</script>

<template>
  <!-- Use flex-col-reverse to fix an issue of z-index with popover in absolute position (actions dropdwon) -->
  <div class="flex flex-col-reverse">
    <PanelContentTree
      v-if="fileTree?.length > 0"
      :tree="fileTree"
      type="file"
    />
    <PanelContentTree
      v-if="folderTree?.length > 0"
      class="mb-6"
      :tree="folderTree"
      type="directory"
    />
  </div>
</template>

<script setup lang="ts">
import { useSidebar } from '../composables/useSidebar'

const { isResizing, startResize } = useSidebar()
</script>

<template>
  <div
    class="absolute top-0 bottom-0 right-0 w-1 cursor-col-resize bg-transparent hover:bg-elevated transition-colors duration-200 group"
    :class="{ 'bg-gray-400': isResizing }"
    @mousedown="startResize"
  >
    <div
      class="absolute top-1/2 right-0 transform -translate-y-1/2 w-1 h-8 bg-elevated rounded-l opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      :class="{ 'opacity-100': isResizing }"
    />
  </div>
</template>

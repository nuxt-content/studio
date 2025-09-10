<script setup lang="ts">
import type { DatabaseItem, TreeItem } from '../../../types'
import type { PropType } from 'vue'
import FileParentCard from '../../shared/file/FileParentCard.vue'
import { useStudio } from '../../../composables/useStudio'

const { tree: { selectItem } } = useStudio()

defineProps({
  type: {
    type: String as PropType<'directory' | 'file'>,
    required: true,
  },
  tree: {
    type: Array as PropType<TreeItem[]>,
    default: () => [],
  },
  currentFile: {
    type: Object as PropType<DatabaseItem>,
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
      <li
        v-show="type === 'directory' && currentFile?.type === 'directory'"
        id="no-drag"
        draggable="false"
      >
        <FileParentCard
          :current-file="currentFile"
        />
      </li>
      <!-- <li
        v-if="ongoingFileAction?.action === `create-${type}`"
        draggable="false"
      >
        <ProjectFileFormItem
          :current-file="currentFile"
          :ongoing-file-action="ongoingFileAction"
          @submit="emit('create', $event)"
        />
      </li> -->
      <li
        v-for="(file, index) in tree"
        :key="`${file.path}-${index}`"
      >
        <FileCard
          :file="file"
          @click="selectItem(file)"
        />
      </li>
    </ul>
  </div>
</template>

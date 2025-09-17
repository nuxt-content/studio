<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'
import { type DatabasePageItem, StudioItemActionId } from '../../../types'

const { tree, draftFiles, context } = useStudio()

const folderTree = computed(() => (tree.current.value || []).filter(f => f.type === 'directory'))
const fileTree = computed(() => (tree.current.value || []).filter(f => f.type === 'file'))

const isFileCreationInProgress = computed(() => context.actionInProgress.value === StudioItemActionId.CreateFile)
const isFolderCreationInProgress = computed(() => context.actionInProgress.value === StudioItemActionId.CreateFolder)
</script>

<template>
  <PanelContentEditor
    v-if="tree.currentItem.value.type === 'file' && draftFiles.current.value"
    :db-item="draftFiles.current.value.document as DatabasePageItem"
  />
  <div
    v-else
    class="flex flex-col"
  >
    <PanelContentTree
      v-if="folderTree?.length > 0 || isFolderCreationInProgress"
      class="mb-4"
      :tree="folderTree"
      :show-creation-form="isFolderCreationInProgress"
      type="directory"
    />
    <PanelContentTree
      v-if="fileTree?.length > 0 || isFileCreationInProgress"
      :tree="fileTree"
      :show-creation-form="isFileCreationInProgress"
      type="file"
    />
  </div>
</template>

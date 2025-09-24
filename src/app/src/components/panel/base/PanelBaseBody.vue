<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'
import { StudioFeature, StudioItemActionId } from '../../../types'

const { documentTree, mediaTree, draftDocuments, draftMedias, context } = useStudio()

const tree = computed(() => context.feature.value === StudioFeature.Content ? documentTree : mediaTree)

const currentFile = computed(() => context.feature.value === StudioFeature.Content ? draftDocuments.current.value : draftMedias.current.value)

const folderTree = computed(() => (tree.value.current.value || []).filter(f => f.type === 'directory'))
const fileTree = computed(() => (tree.value.current.value || []).filter(f => f.type === 'file'))

const isFileCreationInProgress = computed(() => context.actionInProgress.value === StudioItemActionId.CreateDocument)
const isFolderCreationInProgress = computed(() => context.actionInProgress.value === StudioItemActionId.CreateFolder)
</script>

<template>
  <PanelBaseBodyEditor
    v-if="tree.currentItem.value.type === 'file' && currentFile"
    :draft-item="currentFile"
  />
  <div
    v-else
    class="flex flex-col"
  >
    <PanelBaseBodyTree
      v-if="folderTree?.length > 0 || isFolderCreationInProgress"
      class="mb-4"
      :tree="folderTree"
      :show-creation-form="isFolderCreationInProgress"
      type="directory"
    />
    <PanelBaseBodyTree
      v-if="fileTree?.length > 0 || isFileCreationInProgress"
      :tree="fileTree"
      :show-creation-form="isFileCreationInProgress"
      type="file"
    />
  </div>
</template>

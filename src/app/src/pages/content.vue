<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../composables/useStudio'
import { StudioItemActionId } from '../types'

const { documentTree, context } = useStudio()

const folderTree = computed(() => (documentTree.current.value || []).filter(f => f.type === 'directory'))
const fileTree = computed(() => (documentTree.current.value || []).filter(f => f.type === 'file'))

const isFileCreationInProgress = computed(() => context.actionInProgress.value === StudioItemActionId.CreateDocument)
const isFolderCreationInProgress = computed(() => context.actionInProgress.value === StudioItemActionId.CreateFolder)
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center justify-between gap-2 px-4 py-2 border-b-[0.5px] border-default bg-muted">
      <ItemBreadcrumb />
      <ItemActionsToolbar />
    </div>
    <ContentEditor
      v-if="documentTree.currentItem.value.type === 'file' && documentTree.draft.current.value"
      :draft-item="documentTree.draft.current.value"
    />
    <div
      v-else
      class="flex flex-col p-4"
    >
      <ItemTree
        v-if="folderTree?.length > 0 || isFolderCreationInProgress"
        class="mb-2"
        :tree="folderTree"
        :show-creation-form="isFolderCreationInProgress"
        type="directory"
      />
      <ItemTree
        v-if="fileTree?.length > 0 || isFileCreationInProgress"
        :tree="fileTree"
        :show-creation-form="isFileCreationInProgress"
        type="file"
      />
    </div>
  </div>
</template>

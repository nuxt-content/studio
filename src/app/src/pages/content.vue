<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../composables/useStudio'
import { StudioItemActionId, TreeStatus } from '../types'

const { context, ui } = useStudio()

const folderTree = computed(() => (context.activeTree.value.current.value || []).filter(f => f.type === 'directory'))
const fileTree = computed(() => (context.activeTree.value.current.value || []).filter(f => f.type === 'file'))

const currentTreeItem = computed(() => context.activeTree.value.currentItem.value)
const currentDraftItem = computed(() => context.activeTree.value.draft.current.value)

const showFolderForm = computed(() => {
  return context.actionInProgress.value?.id === StudioItemActionId.CreateFolder
    || (
      context.actionInProgress.value?.id === StudioItemActionId.RenameItem
      && context.actionInProgress.value?.item?.type === 'directory'
    )
})

const showFileForm = computed(() => {
  return context.actionInProgress.value?.id === StudioItemActionId.CreateDocument
    || (
      context.actionInProgress.value?.id === StudioItemActionId.RenameItem
      && context.actionInProgress.value?.item?.type === 'file')
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-2 px-4 py-1 border-b-[0.5px] border-default bg-muted/70">
      <ItemBreadcrumb />
      <ItemActionsToolbar />
    </div>
    <ContentEditor
      v-if="currentTreeItem.type === 'file' && currentDraftItem"
      :draft-item="currentDraftItem!"
      :read-only="currentTreeItem.status === TreeStatus.Deleted"
    />
    <div
      v-else-if="ui.config.value.showTechnicalMode"
    >
      Developer tree
    </div>
    <div
      v-else
      class="flex flex-col p-4"
    >
      <ItemTree
        v-if="folderTree?.length > 0 || showFolderForm"
        class="mb-2"
        :tree="folderTree"
        :show-form="showFolderForm"
        type="directory"
      />
      <ItemTree
        v-if="fileTree?.length > 0 || showFileForm"
        :tree="fileTree"
        :show-form="showFileForm"
        type="file"
      />
    </div>
  </div>
</template>

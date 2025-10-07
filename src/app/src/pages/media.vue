<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../composables/useStudio'
import { StudioItemActionId } from '../types'

const { context } = useStudio()

const folderTree = computed(() => (context.activeTree.value.current.value || []).filter(f => f.type === 'directory'))
const fileTree = computed(() => (context.activeTree.value.current.value || []).filter(f => f.type === 'file'))

const isFileCreationInProgress = computed(() => context.actionInProgress.value?.id === StudioItemActionId.CreateDocument)
const isFolderCreationInProgress = computed(() => context.actionInProgress.value?.id === StudioItemActionId.CreateFolder)

const currentTreeItem = computed(() => context.activeTree.value.currentItem.value)
const currentDraftItem = computed(() => context.activeTree.value.draft.current.value)

async function onFileDrop(event: DragEvent) {
  if (currentDraftItem.value) {
    return
  }

  if (event.dataTransfer?.files) {
    await context.itemActionHandler[StudioItemActionId.UploadMedia]({
      parentFsPath: currentTreeItem.value.fsPath,
      files: Array.from(event.dataTransfer.files),
    })
  }
}
</script>

<template>
  <div
    @drop.prevent.stop="onFileDrop"
    @dragover.prevent.stop
  >
    <div class="flex items-center justify-between gap-2 px-4 py-1 border-b-[0.5px] border-default bg-muted/70">
      <ItemBreadcrumb />
      <ItemActionsToolbar />
    </div>
    <MediaEditor
      v-if="currentTreeItem.type === 'file' && currentDraftItem"
      :draft-item="currentDraftItem!"
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

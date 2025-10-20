<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../composables/useStudio'
import { StudioItemActionId, StudioFeature } from '../types'

const { context } = useStudio()

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
      :media-item="currentDraftItem.modified || currentDraftItem.original!"
      :status="currentDraftItem.status"
    />
    <div
      v-else
      class="flex flex-col p-4"
    >
      <div v-if="folderTree?.length > 0 || showFolderForm">
        <div class="flex items-center gap-1 mb-3">
          <UIcon
            name="i-lucide-folder"
            class="size-3.5 text-muted"
          />
          <h3 class="text-xs font-semibold uppercase tracking-wider text-muted">
            Directories
          </h3>
          <UBadge
            v-if="folderTree?.length > 0"
            :label="folderTree.length.toString()"
            color="neutral"
            variant="soft"
            size="xs"
          />
          <div class="flex-1 h-px bg-border ml-2" />
        </div>
        <ItemTree
          class="mb-6"
          :tree="folderTree"
          :show-form="showFolderForm"
          :feature="StudioFeature.Media"
        />
      </div>
      <div v-if="fileTree?.length > 0 || showFileForm">
        <div class="flex items-center gap-1 mb-3">
          <UIcon
            name="i-lucide-image"
            class="size-3.5 text-muted"
          />
          <h3 class="text-xs font-semibold uppercase tracking-wider text-muted">
            Media
          </h3>
          <UBadge
            v-if="fileTree?.length > 0"
            :label="fileTree.length.toString()"
            color="neutral"
            variant="soft"
            size="xs"
          />
          <div class="flex-1 h-px bg-border ml-2" />
        </div>
        <ItemTree
          :tree="fileTree"
          :show-form="showFileForm"
          :feature="StudioFeature.Media"
        />
      </div>
    </div>
  </div>
</template>

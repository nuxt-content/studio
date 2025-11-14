<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../composables/useStudio'
import { StudioItemActionId, TreeStatus, StudioFeature } from '../types'

const { context, documentTree } = useStudio()

const folderTree = computed(() => (documentTree.current.value || []).filter(f => f.type === 'directory'))
const fileTree = computed(() => (documentTree.current.value || []).filter(f => f.type === 'file'))

const currentTreeItem = computed(() => documentTree.currentItem.value)
const currentDraftItem = computed(() => documentTree.draft.current.value)

const showFolderForm = computed(() => {
  return context.actionInProgress.value?.id === StudioItemActionId.CreateDocumentFolder
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
  <div class="h-full flex flex-col">
    <div class="flex items-center justify-between gap-2 px-4 py-1 border-b-[0.5px] border-default bg-muted/70">
      <ItemBreadcrumb />
      <ItemActionsToolbar />
    </div>

    <div class="flex-1 relative">
      <div
        v-if="documentTree.draft.isLoading.value"
        class="absolute inset-0 bg-primary/3 animate-pulse z-10 pointer-events-none"
      />
      <template v-else>
        <ContentEditor
          v-if="currentTreeItem.type === 'file' && currentDraftItem"
          :draft-item="currentDraftItem!"
          :read-only="currentTreeItem.status === TreeStatus.Deleted"
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
              <h3 class="text-xs uppercase tracking-wider text-muted">
                {{ $t('studio.headings.directories') }}
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
              :feature="StudioFeature.Content"
            />
          </div>
          <div v-if="fileTree?.length > 0 || showFileForm">
            <div class="flex items-center gap-1 mb-3">
              <UIcon
                name="i-lucide-file"
                class="size-3.5 text-muted"
              />
              <h3 class="text-xs uppercase tracking-wider text-muted">
                {{ $t('studio.headings.files') }}
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
              :feature="StudioFeature.Content"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

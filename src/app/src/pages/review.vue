<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../composables/useStudio'
import { DraftStatus } from '../types'

const { context, documentTree, mediaTree } = useStudio()

const allDrafts = computed(() => {
  const documents = documentTree.draft.list.value || []
  const medias = mediaTree.draft.list.value || []

  return [...documents, ...medias].filter(draft =>
    draft.status !== DraftStatus.Pristine,
  )
})

const groupedDrafts = computed(() => {
  return {
    created: allDrafts.value.filter(d => d.status === DraftStatus.Created),
    updated: allDrafts.value.filter(d => d.status === DraftStatus.Updated),
    deleted: allDrafts.value.filter(d => d.status === DraftStatus.Deleted),
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between gap-2 px-4 py-1 border-b-[0.5px] border-default bg-muted/70">
      <div class="flex items-center gap-2">
        <h2 class="text-xs font-semibold">
          Review changes
        </h2>
        <UBadge
          v-if="context.draftCount.value > 0"
          :label="context.draftCount.value.toString()"
          color="primary"
          variant="soft"
        />
      </div>
      <div class="flex items-center gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          to="/content"
        />
      </div>
    </div>

    <div class="flex-1 overflow-auto p-4">
      <div class="flex flex-col gap-2 mx-auto">
        <div v-if="groupedDrafts.created.length > 0">
          <div class="flex items-center gap-2 mb-2">
            <UIcon
              name="i-lucide-plus-circle"
              class="w-4 h-4 text-success"
            />
            <span class="text-xs font-medium">
              Created ({{ groupedDrafts.created.length }})
            </span>
          </div>
          <div class="flex flex-col gap-2">
            <ReviewCard
              v-for="draft in groupedDrafts.created"
              :key="draft.id"
              :draft-item="draft"
            />
          </div>
        </div>

        <div v-if="groupedDrafts.updated.length > 0">
          <div class="flex items-center gap-2 mb-2 mt-4">
            <UIcon
              name="i-lucide-file-edit"
              class="w-4 h-4 text-warning"
            />
            <span class="text-xs font-medium">
              Modified ({{ groupedDrafts.updated.length }})
            </span>
          </div>
          <div class="flex flex-col gap-2">
            <ReviewCard
              v-for="draft in groupedDrafts.updated"
              :key="draft.id"
              :draft-item="draft"
            />
          </div>
        </div>

        <div v-if="groupedDrafts.deleted.length > 0">
          <div class="flex items-center gap-2 mb-2 mt-4">
            <UIcon
              name="i-lucide-trash-2"
              class="w-4 h-4 text-error"
            />
            <span class="text-xs font-medium">
              Deleted ({{ groupedDrafts.deleted.length }})
            </span>
          </div>
          <div class="flex flex-col gap-2">
            <ReviewCard
              v-for="draft in groupedDrafts.deleted"
              :key="draft.id"
              :draft-item="draft"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

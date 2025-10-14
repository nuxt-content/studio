<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../composables/useStudio'
import { DraftStatus } from '../types'

const { context } = useStudio()

const groupedDrafts = computed(() => {
  return {
    created: context.allDrafts.value.filter(d => d.status === DraftStatus.Created),
    updated: context.allDrafts.value.filter(d => d.status === DraftStatus.Updated),
    deleted: context.allDrafts.value.filter(d => d.status === DraftStatus.Deleted),
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-1 border-b-[0.5px] border-default bg-muted/70">
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

    <div class="flex-1 overflow-auto p-4">
      <div class="flex flex-col gap-2 mx-auto">
        <div
          v-if="groupedDrafts.created.length > 0"
          class="mb-4"
        >
          <div class="flex items-center gap-2 mb-2">
            <UIcon
              name="i-lucide-file-plus-2"
              class="w-4 h-4 text-success"
            />
            <span class="text-sm font-semibold">Created</span>
            <UBadge
              :label="groupedDrafts.created.length.toString()"
              color="success"
              variant="soft"
            />
          </div>
          <div class="flex flex-col gap-2">
            <ReviewCard
              v-for="draft in groupedDrafts.created"
              :key="draft.id"
              :draft-item="draft"
            />
          </div>
        </div>

        <div
          v-if="groupedDrafts.updated.length > 0"
          class="mb-4"
        >
          <div class="flex items-center gap-2 mb-2">
            <UIcon
              name="i-lucide-file-edit"
              class="w-4 h-4 text-warning"
            />
            <span class="text-sm font-semibold">Updated</span>
            <UBadge
              :label="groupedDrafts.updated.length.toString()"
              color="warning"
              variant="soft"
            />
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
          <div class="flex items-center gap-2 mb-2">
            <UIcon
              name="i-lucide-file-x-2"
              class="w-4 h-4 text-error"
            />
            <span class="text-sm font-semibold">Deleted</span>
            <UBadge
              :label="groupedDrafts.deleted.length.toString()"
              color="error"
              variant="soft"
            />
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

<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../composables/useStudio'
import { DraftStatus } from '../types'
import { isMediaFile } from '../utils/file'
import { COLOR_UI_STATUS_MAP } from '../utils/tree'

const { context } = useStudio()

const groupedDrafts = computed(() => {
  return {
    created: context.allDrafts.value.filter(d => d.status === DraftStatus.Created),
    updated: context.allDrafts.value.filter(d => d.status === DraftStatus.Updated),
    deleted: context.allDrafts.value.filter(d => d.status === DraftStatus.Deleted),
  }
})

const statusConfig = {
  created: {
    icon: 'i-lucide-file-plus-2',
    label: 'Created',
    color: COLOR_UI_STATUS_MAP[DraftStatus.Created],
    iconClass: 'text-success',
  },
  updated: {
    icon: 'i-lucide-file-edit',
    label: 'Updated',
    color: COLOR_UI_STATUS_MAP[DraftStatus.Updated],
    iconClass: 'text-warning',
  },
  deleted: {
    icon: 'i-lucide-file-x-2',
    label: 'Deleted',
    color: COLOR_UI_STATUS_MAP[DraftStatus.Deleted],
    iconClass: 'text-error',
  },
} as const
</script>

<template>
  <div class="flex flex-col h-full text-default">
    <div class="flex items-center gap-1 px-4 py-2 border-b-[0.5px] border-default bg-muted/70">
      <h2 class="text-xs font-semibold text-muted">
        Review changes
      </h2>
      <UBadge
        v-if="context.draftCount.value > 0"
        :label="context.draftCount.value.toString()"
        color="primary"
        variant="soft"
        size="xs"
      />
    </div>

    <div class="flex-1 overflow-auto p-4">
      <div class="flex flex-col gap-2 mx-auto">
        <template
          v-for="(drafts, status) in groupedDrafts"
          :key="status"
        >
          <div
            v-if="drafts.length > 0"
            class="mb-4"
          >
            <div class="flex items-center gap-1 mb-2">
              <UIcon
                :name="statusConfig[status].icon"
                :class="statusConfig[status].iconClass"
                class="w-3.5 h-3.5"
              />
              <span class="text-xs font-semibold">{{ statusConfig[status].label }}</span>
              <UBadge
                :label="drafts.length.toString()"
                :color="statusConfig[status].color as never"
                variant="soft"
                size="xs"
              />
            </div>
            <div class="flex flex-col gap-2">
              <template
                v-for="draft in drafts"
                :key="draft.fsPath"
              >
                <MediaCardReview
                  v-if="isMediaFile(draft.fsPath)"
                  :draft-item="draft"
                />
                <ContentCardReview
                  v-else
                  :draft-item="draft"
                />
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

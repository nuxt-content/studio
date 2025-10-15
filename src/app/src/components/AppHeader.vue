<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed, ref } from 'vue'
import { useStudio } from '../composables/useStudio'
import { StudioBranchActionId } from '../types'
import { useToast } from '@nuxt/ui/composables/useToast'

const router = useRouter()
const route = useRoute()
const { context } = useStudio()

const commitMessage = ref('')
const isPublishing = ref(false)

const items = [
  {
    label: 'Content',
    value: 'content',
    to: '/content',
  },
  {
    label: 'Media',
    value: 'media',
    to: '/media',
  },
]

const current = computed({
  get: () => route.name as string,
  set: (name: string) => router.push({ name }),
})

const toast = useToast()
const isReviewPage = computed(() => route.name === 'review')

async function publishChanges() {
  isPublishing.value = true
  try {
    await context.branchActionHandler[StudioBranchActionId.PublishBranch]({ commitMessage: commitMessage.value })

    toast.add({
      title: 'Changes published',
      description: 'Changes have been successfully pushed to the remote repository.',
      color: 'success',
    })
  }
  catch (error) {
    toast.add({
      title: 'Failed to publish changes',
      description: (error as Error).message,
      color: 'error',
    })
  }
  finally {
    isPublishing.value = false
  }
}
</script>

<template>
  <div class="bg-muted/50 border-default border-b-[0.5px] pr-4 gap-1.5 flex items-center justify-between px-4">
    <div
      v-if="!isReviewPage"
      class="w-full flex items-center justify-between gap-2"
    >
      <UTabs
        v-model="current"
        :content="false"
        :items="items"
        variant="link"
        size="md"
        color="neutral"
        :ui="{ trigger: 'py-1 px-2', list: 'p-2' }"
      />

      <UButton
        label="Review"
        color="neutral"
        variant="solid"
        :disabled="context.draftCount.value === 0"
        to="/review"
      >
        <div class="flex items-center gap-2">
          Review
          <UBadge
            v-if="context.draftCount.value > 0"
            :label="context.draftCount.value.toString()"
            size="xs"
            color="warning"
            variant="soft"
          />
        </div>
      </UButton>
    </div>

    <div
      v-else
      class="flex-1 flex items-center gap-2 py-2"
    >
      <UButton
        icon="i-ph-arrow-left"
        color="neutral"
        variant="soft"
        size="sm"
        aria-label="Back"
        to="/content"
      />
      <UInput
        v-model="commitMessage"
        placeholder="Commit message"
        size="sm"
        :loading="isPublishing"
        class="flex-1"
      />
      <UButton
        label="Publish"
        color="neutral"
        variant="solid"
        :loading="isPublishing"
        :disabled="isReviewPage && !commitMessage?.trim()"
        @click="publishChanges"
      />
    </div>
  </div>
</template>

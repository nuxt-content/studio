<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed, ref } from 'vue'
import { useStudio } from '../composables/useStudio'

const router = useRouter()
const route = useRoute()
const { context } = useStudio()

const commitMessage = ref('')

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

const isReviewPage = computed(() => route.name === 'review')
const buttonLabel = computed(() => isReviewPage.value ? 'Publish' : 'Review')

function handleButtonClick() {
  if (isReviewPage.value) {
    // TODO: Implement publish logic
    console.log('Publishing changes...', { message: commitMessage.value })
  }
  else {
    router.push('/review')
  }
}
</script>

<template>
  <div class="bg-muted/50 border-default border-b-[0.5px] pr-4 gap-1.5 flex items-center justify-between">
    <div
      v-if="!isReviewPage"
      class="flex-1"
    >
      <UTabs
        v-model="current"
        :content="false"
        :items="items"
        class="w-full"
        variant="link"
        size="md"
        color="neutral"
        :ui="{ trigger: 'py-1 px-2', list: 'p-2' }"
      />
    </div>

    <div
      v-else
      class="flex-1 px-4 py-2"
    >
      <UInput
        v-model="commitMessage"
        placeholder="Commit message"
        size="sm"
        :disabled="!context.isDraftInProgress.value"
        class="w-full"
      />
    </div>

    <div class="flex items-center gap-2">
      <UButton
        :label="buttonLabel"
        color="neutral"
        variant="solid"
        :disabled="!context.isDraftInProgress.value"
        @click="handleButtonClick"
      />
    </div>
  </div>
</template>

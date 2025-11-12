<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
import { useStudio } from '../../composables/useStudio'
import type { StudioFeature } from '../../types'
import { useStudioState } from '../../composables/useStudioState'

const router = useRouter()
const route = useRoute()
const { context } = useStudio()
const { setLocation, devMode } = useStudioState()

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
  set: async (name: StudioFeature) => {
    await router.push({ name })

    const currentItem = context.activeTree.value.currentItem.value
    setLocation(name, currentItem.fsPath)

    // Ensure root item status is up to date when navigating by selecting computed
    if (currentItem.type === 'root') {
      await context.activeTree.value.select(context.activeTree.value.rootItem.value)
    }
  },
})
</script>

<template>
  <div class="w-full flex items-center justify-between gap-2">
    <UTabs
      v-model="current"
      :content="false"
      :items="items"
      variant="link"
      size="md"
      color="neutral"
      :ui="{ trigger: 'py-1 px-2', list: 'py-2 px-0' }"
    />

    <UButton
      v-if="!devMode"
      label="Review"
      color="neutral"
      :variant="context.draftCount.value > 0 ? 'solid' : 'soft'"
      to="/review"
      :disabled="context.draftCount.value === 0"
      icon="i-lucide-file-diff"
      :ui="{ leadingIcon: 'size-3.5' }"
    >
      <template
        v-if="context.draftCount.value > 0"
        #leading
      >
        <UBadge
          :label="context.draftCount.value.toString()"
          class="bg-neutral-400"
          size="xs"
          variant="soft"
        />
      </template>
    </UButton>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
import { useStudio } from '../../composables/useStudio'

const router = useRouter()
const route = useRoute()
const { context } = useStudio()

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
          class="bg-[var(--ui-color-neutral-400)]"
          size="xs"
          variant="soft"
        />
      </template>
    </UButton>
  </div>
</template>

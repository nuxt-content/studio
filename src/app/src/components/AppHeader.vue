<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

const items: TabsItem[] = [
  {
    label: 'Content',
    value: 'content',
  },
  {
    label: 'Media',
    value: 'media',
  },
]

const current = computed({
  get: () => route.name as string,
  set: (name: string) => router.push({ name }),
})
</script>

<template>
  <div
    class="bg-muted/50 border-default border-b-[0.5px] pr-4 gap-1.5 flex items-center justify-between"
  >
    <div class="flex-1">
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

    <div class="flex items-center gap-1">
      <UButton
        label="Publish"
        color="neutral"
        variant="solid"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const model = defineModel<Record<string, unknown>>({ required: true })

const jsonString = computed({
  get: () => JSON.stringify(model.value, null, 2),
  set: (value: string) => {
    try {
      model.value = JSON.parse(value)
    }
    catch {
      // Invalid JSON, don't update
    }
  },
})
</script>

<template>
  <UTextarea
    v-model="jsonString"
    autoresize
    :rows="10"
    class="font-mono text-sm"
  />
</template>

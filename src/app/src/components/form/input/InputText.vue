<script setup lang="ts">
const model = defineModel<string | number>({ default: '' })
</script>

<template>
  <UInput
    v-model="model"
    placeholder="Enter text..."
    size="xs"
    class="w-full"
  />
</template>

<script setup lang="ts">
const model = defineModel({ type: Boolean, default: false })
</script>

<template>
  <USwitch
    v-model="model"
    size="xs"
  />
</template>

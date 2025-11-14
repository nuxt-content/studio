<script setup lang="ts">
const { data } = await useAsyncData('pages', () => queryCollection('custom').first())
</script>

<template>
  <div>
    <ContentRenderer :value="data" />
  </div>
</template>

<script setup lang="ts">
const { data } = await useAsyncData('posts', () => queryCollection('docs').path(useRoute().path).first())
</script>

<template>
  <div>
    <header class="header">
      <h1>Minimal Playground</h1>
    </header>
    <div class="content">
      <ContentRenderer
        v-if="data"
        :value="data"
      />
    </div>
  </div>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e5e5e5;
  padding: 0.75rem 1rem;
}

.header h1 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.content {
  padding-top: 3.5rem;
}

@media (prefers-color-scheme: dark) {
  .header {
    background-color: #1a1a1a;
    border-bottom-color: #333;
  }
}
</style>

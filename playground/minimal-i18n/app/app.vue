<script setup lang="ts">
import type { Collections } from '@nuxt/content'

const { locale, locales, setLocale } = useI18n()

const collectionName = computed(() => `docs_${locale.value}` as keyof Collections)
const contentPath = computed(() => locale.value === 'fr' ? '/fr' : '/')

const { data } = await useAsyncData(
  () => `home-${locale.value}`,
  () => queryCollection(collectionName.value).path(contentPath.value).first(),
  { watch: [locale] },
)
</script>

<template>
  <div>
    <header class="header">
      <div class="header-inner">
        <h1>Minimal i18n Playground</h1>
        <nav
          class="locale-nav"
          aria-label="Language"
        >
          <button
            v-for="entry in locales"
            :key="entry.code"
            type="button"
            class="locale-button"
            :class="{ active: locale === entry.code }"
            @click="setLocale(entry.code)"
          >
            {{ entry.name }}
          </button>
        </nav>
      </div>
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

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 48rem;
  margin: 0 auto;
}

.header h1 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.locale-nav {
  display: flex;
  gap: 0.5rem;
}

.locale-button {
  border: 1px solid #d4d4d4;
  background: white;
  border-radius: 0.375rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.locale-button.active {
  border-color: #737373;
  font-weight: 600;
}

.content {
  max-width: 48rem;
  margin: 0 auto;
  padding: 4.5rem 1rem 2rem;
}

@media (prefers-color-scheme: dark) {
  .header {
    background-color: #1a1a1a;
    border-bottom-color: #333;
  }

  .locale-button {
    background: #262626;
    border-color: #404040;
    color: #f5f5f5;
  }

  .locale-button.active {
    border-color: #a3a3a3;
  }
}
</style>

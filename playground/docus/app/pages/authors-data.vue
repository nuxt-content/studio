<script setup lang="ts">
import type { MarkdownRoot } from '@nuxt/content'
import { decompressTree } from '@nuxt/content/runtime'

const { data: datas } = await useAsyncData('datas-collection', async () => {
  const items = await queryCollection('datas').order('order', 'ASC').all()
  return items.map(item => ({
    ...item,
    body: item.meta?.body ? decompressTree(item.meta.body as MarkdownRoot) : null,
  }))
})
</script>

<template>
  <div>
    <UContainer class="m-4">
      <h1 class="text-2xl font-bold mb-4">
        Data Collection
      </h1>
      <div class="flex flex-col gap-4">
        <UCard
          v-for="item in datas"
          :key="item.stem"
          :to="item.link"
          target="_blank"
        >
          <div class="flex items-center gap-2 mb-2">
            <UIcon
              :name="item.icon"
              class="w-5 h-5"
            />
            <h2 class="text-lg font-semibold">
              {{ item.title }}
            </h2>
          </div>
          <MDCRenderer
            v-if="item.body"
            :body="item.body"
          />
          <img
            :src="item.image"
            :alt="item.title"
            class="w-full h-32 object-cover rounded mb-2"
          >
        </UCard>
      </div>
    </UContainer>
  </div>
</template>

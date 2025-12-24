<script setup lang="ts">
const { data: page } = await useAsyncData('authors-page', () => queryCollection('pages').first())

const { data: authors } = await useAsyncData('authors-list', () => queryCollection('authors').all())
</script>

<template>
  <div>
    <UContainer>
      <ContentRenderer :value="page" />
      <div class="flex flex-col gap-2">
        <UUser
          v-for="author in authors"
          :key="author.name"
          :name="author.name"
          :description="author.username ? `@${author.username}` : ''"
          :avatar="author.avatar"
          :to="author.to"
        >
          <template #name>
            <div class="flex gap-2">
              <span class="text-sm font-medium">{{ author.name }}</span>
              <span class="text-sm text-muted">
                - {{ author.username ? `@${author.username}` : '' }}
              </span>
            </div>
          </template>

          <template #description>
            <div class="flex gap-2">
              <UBadge
                v-for="module in author.modules"
                :key="module"
                variant="soft"
                size="xs"
                color="neutral"
              >
                {{ module }}
              </UBadge>
            </div>
          </template>
        </UUser>
      </div>
    </UContainer>
  </div>
</template>

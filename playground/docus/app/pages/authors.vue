<script setup lang="ts">
const { data: page } = await useAsyncData('authors-page', () => queryCollection('pages').first())

const { data: authors } = await useAsyncData('authors-list', () => queryCollection('authors').all())
</script>

<template>
  <div>
    <UContainer>
      <ContentRenderer :value="page" />

      <UUser
        v-for="author in authors"
        :key="author.name"
        :name="author.name"
        :description="author.username ? `@${author.username}` : ''"
        :avatar="author.avatar"
        :to="author.to"
      />
    </UContainer>
  </div>
</template>

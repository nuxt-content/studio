<script setup lang="ts">
const { data: authors } = await useAsyncData('authors-list', () => queryCollection('authors').all())

const roleConfig: Record<string, { color: 'warning' | 'info' | 'success', icon: string }> = {
  creator: { color: 'warning', icon: 'i-lucide-crown' },
  maintainer: { color: 'info', icon: 'i-lucide-shield-check' },
  contributor: { color: 'success', icon: 'i-lucide-git-pull-request' },
}

function formatDate(date: string | Date | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
</script>

<template>
  <UContainer class="py-12">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard
        v-for="author in authors"
        :key="author.name"
        class="group hover:ring-2 hover:ring-primary/50 transition-all duration-200 relative overflow-visible"
      >
        <UBadge
          v-if="author.isOpenSourceLover"
          color="success"
          size="sm"
          class="absolute -top-2 -right-2 z-10"
          title="Open Source Lover"
        >
          <UIcon
            name="i-lucide-heart"
            class="size-3"
          />
        </UBadge>

        <div class="flex flex-col items-center text-center gap-4">
          <UAvatar
            :src="author.avatar?.src"
            :alt="author.avatar?.alt || author.name"
            size="3xl"
            class="ring-4 ring-muted group-hover:ring-primary/30 transition-all duration-200"
          />

          <div class="flex flex-col items-center gap-2">
            <NuxtLink
              :to="author.to"
              target="_blank"
              class="text-lg font-semibold text-highlighted hover:text-primary transition-colors"
            >
              {{ author.name }}
            </NuxtLink>
            <span
              v-if="author.username"
              class="text-sm text-muted"
            >
              @{{ author.username }}
            </span>
            <UBadge
              v-if="author.role"
              :color="roleConfig[author.role]?.color || 'neutral'"
              variant="subtle"
              size="xs"
              class="capitalize"
            >
              <UIcon
                :name="roleConfig[author.role]?.icon || 'i-lucide-user'"
                class="size-3 mr-1"
              />
              {{ author.role }}
            </UBadge>
            <span
              v-if="author.birthDate"
              class="text-xs text-dimmed flex items-center gap-1"
            >
              <UIcon
                name="i-lucide-cake"
                class="size-3"
              />
              {{ formatDate(author.birthDate) }}
            </span>
          </div>

          <div
            v-if="author.modules?.length"
            class="flex flex-wrap justify-center gap-1.5"
          >
            <UBadge
              v-for="module in author.modules"
              :key="module"
              variant="outline"
              size="sm"
              color="neutral"
            >
              {{ module }}
            </UBadge>
          </div>

          <UButton
            :to="author.to"
            target="_blank"
            variant="soft"
            color="neutral"
            size="sm"
            trailing-icon="i-lucide-external-link"
            class="mt-2"
          >
            View Profile
          </UButton>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>

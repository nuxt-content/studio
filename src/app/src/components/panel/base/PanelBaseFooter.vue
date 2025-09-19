<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'

const studio = useStudio()

const user = studio.host.user.get()

const userMenuItems = computed(() => [
  {
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    onClick: () => {
      alert('TODO: delete cookie manually')
    },
  },
])
</script>

<template>
  <UFooter class="h-var(--ui-footer-height)">
    <template #left>
      <UDropdownMenu
        :portal="false"
        :items="userMenuItems"
        :ui="{ slots: { content: 'w-full' } }"
        placeholder="Select a content"
      >
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
        >
          <UAvatar
            :src="user?.avatar"
            size="xs"
          />
          <span>{{ user?.name }}</span>
        </UButton>
      </UDropdownMenu>
    </template>

    <template #right>
      <UButton
        icon="i-lucide-panel-left-close"
        variant="link"
        color="neutral"
        size="md"
        @click="studio.ui.closePanels()"
      />
    </template>
  </UFooter>
</template>

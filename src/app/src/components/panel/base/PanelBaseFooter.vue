<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'

const { ui, host } = useStudio()

const uiConfig = ui.config
const user = host.user.get()

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
  <UFooter class="h-var(--ui-footer-height) sticky bottom-0 bg-white">
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
      <UTooltip :text="uiConfig.syncEditorAndRoute ? 'Disable synchronization between editor and host' : 'Enable synchronization between editor and host'">
        <UButton
          icon="i-lucide-arrow-left-right"
          variant="link"
          :color="uiConfig.syncEditorAndRoute ? 'success' : 'neutral'"
          size="md"
          @click="uiConfig.syncEditorAndRoute = !uiConfig.syncEditorAndRoute"
        />
      </UTooltip>
      <UButton
        icon="i-lucide-panel-left-close"
        variant="link"
        color="neutral"
        size="md"
        @click="ui.closePanels()"
      />
    </template>
  </UFooter>
</template>

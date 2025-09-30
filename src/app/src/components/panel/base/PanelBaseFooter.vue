<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'

const { ui, host } = useStudio()

const uiConfig = ui.config
const user = host.user.get()
const repositoryUrl = computed(() => {
  switch (host.repository.provider) {
    case 'github':
      return `https://github.com/${host.repository.owner}/${host.repository.repo}/tree/${host.repository.branch}`
    default:
      return ''
  }
})

const userMenuItems = computed(() => [
  [{
    label: 'Open Repository',
    icon: 'i-lucide-github',
    onClick: () => {
      window.open(repositoryUrl.value, '_blank')
    },
  }],
  [{
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    onClick: () => {
      alert('TODO: delete cookie manually')
    },
  }],
])
</script>

<template>
  <UFooter
    class="h-var(--ui-footer-height) sticky bottom-0 bg-white"
    :ui="{ container: 'px-2 sm:px-2 lg:px-2', right: 'gap-0' }"
  >
    <template #left>
      <UDropdownMenu
        :portal="false"
        :items="userMenuItems"
        :ui="{ content: 'w-full' }"
        size="xs"
      >
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          :avatar="{ src: user?.avatar, alt: user?.name, size: '2xs' }"
          class="px-2 font-medium"
          :label="user?.name"
        />
      </UDropdownMenu>
    </template>

    <template #right>
      <UTooltip
        :text="uiConfig.syncEditorAndRoute ? 'Unlink editor and preview' : 'Link editor and preview'"
        :delay-duration="0"
      >
        <UButton
          icon="i-lucide-arrow-left-right"
          variant="ghost"
          :color="uiConfig.syncEditorAndRoute ? 'info' : 'neutral'"
          :class="!uiConfig.syncEditorAndRoute && 'opacity-50'"
          size="sm"
          @click="uiConfig.syncEditorAndRoute = !uiConfig.syncEditorAndRoute"
        />
      </UTooltip>
      <UButton
        icon="i-lucide-panel-left-close"
        variant="ghost"
        color="neutral"
        size="sm"
        @click="ui.closePanels()"
      />
    </template>
  </UFooter>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../composables/useStudio'

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
    label: `${host.repository.owner}/${host.repository.repo}`,
    icon: 'i-simple-icons:github',
    to: repositoryUrl.value,
    target: '_blank',
  }],
  [{
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    onClick: () => {
      fetch('/__nuxt_content/studio/auth/session', { method: 'delete' }).then(() => {
        document.location.reload()
      })
    },
  }],
])
</script>

<template>
  <div
    class="bg-muted/50 border-default border-t-[0.5px] flex items-center justify-between gap-1.5 px-2 py-2"
  >
    <UDropdownMenu
      :portal="false"
      :items="userMenuItems"
      :ui="{ content: 'w-full' }"
    >
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        :avatar="{ src: user?.avatar, alt: user?.name, size: '2xs' }"
        class="px-2 py-1 font-medium"
        :label="user?.name"
      />
    </UDropdownMenu>

    <div class="flex items-center">
      <UTooltip
        :text="uiConfig.syncEditorAndRoute ? 'Unlink editor and preview' : 'Link editor and preview'"
        :delay-duration="0"
      >
        <UButton
          icon="i-lucide-arrow-left-right"
          variant="ghost"
          :color="uiConfig.syncEditorAndRoute ? 'info' : 'neutral'"
          :class="!uiConfig.syncEditorAndRoute && 'opacity-50'"
          @click="uiConfig.syncEditorAndRoute = !uiConfig.syncEditorAndRoute"
        />
      </UTooltip>
      <UButton
        icon="i-lucide-panel-left-close"
        variant="ghost"
        color="neutral"
        @click="ui.close()"
      />
    </div>
  </div>
</template>

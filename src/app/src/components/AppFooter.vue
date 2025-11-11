<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../composables/useStudio'
import { useStudioState } from '../composables/useStudioState'
import type { DropdownMenuItem } from '@nuxt/ui'

const { ui, host, git } = useStudio()
const { preferences, updatePreference, unsetActiveLocation } = useStudioState()
const user = host.user.get()

// const showTechnicalMode = computed({
//   get: () => preferences.value.showTechnicalMode,
//   set: (value) => {
//     updatePreference('showTechnicalMode', value)
//   },
// })

const repositoryUrl = computed(() => git.getBranchUrl())
const userMenuItems = computed(() => [
  repositoryUrl.value
    ? [
        // [{
        //   slot: 'view-mode' as const,
        // }
        {
          label: `${host.repository.owner}/${host.repository.repo}`,
          icon: 'i-simple-icons:github',
          to: repositoryUrl.value,
          target: '_blank',
        },
      ]
    : undefined,
  [{
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    onClick: () => {
      fetch('/__nuxt_studio/auth/session', { method: 'delete' }).then(() => {
        window.location.reload()
      })
    },
  }],
].filter(Boolean) as DropdownMenuItem[][])

function closeStudio() {
  unsetActiveLocation()
  ui.close()
}
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
      <!-- <template #view-mode>
        <div
          class="w-full"
          @click.stop
        >
          <USwitch
            v-model="showTechnicalMode"
            label="Developer view"
            size="xs"
            :ui="{ root: 'w-full flex-row-reverse justify-between', wrapper: 'ms-0' }"
          />
        </div>
      </template> -->
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
        :text="preferences.syncEditorAndRoute ? 'Unlink editor and preview' : 'Link editor and preview'"
        :delay-duration="0"
      >
        <UButton
          icon="i-lucide-arrow-left-right"
          variant="ghost"
          :color="preferences.syncEditorAndRoute ? 'info' : 'neutral'"
          :class="!preferences.syncEditorAndRoute && 'opacity-50'"
          @click="updatePreference('syncEditorAndRoute', !preferences.syncEditorAndRoute)"
        />
      </UTooltip>
      <UButton
        icon="i-lucide-panel-left-close"
        variant="ghost"
        color="neutral"
        @click="closeStudio"
      />
    </div>
  </div>
</template>

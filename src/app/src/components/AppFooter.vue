<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStudio } from '../composables/useStudio'
import { useStudioState } from '../composables/useStudioState'
import type { DropdownMenuItem } from '@nuxt/ui/runtime/components/DropdownMenu.vue.d.ts'

const { ui, host, gitProvider } = useStudio()
const { devMode, preferences, updatePreference, unsetActiveLocation } = useStudioState()
const user = host.user.get()
const { t } = useI18n()

// const showTechnicalMode = computed({
//   get: () => preferences.value.showTechnicalMode,
//   set: (value) => {
//     updatePreference('showTechnicalMode', value)
//   },
// })

const repositoryUrl = computed(() => gitProvider.api.getBranchUrl())
const userMenuItems = computed(() => [
  repositoryUrl.value
    ? [
        // [{
        //   slot: 'view-mode' as const,
        // }
        {
          label: `${host.repository.owner}/${host.repository.repo}`,
          icon: gitProvider.icon,
          to: repositoryUrl.value,
          target: '_blank',
        },
      ]
    : undefined,
  [{
    label: t('studio.buttons.signOut'),
    icon: 'i-lucide-log-out',
    onClick: () => {
      fetch('/__nuxt_studio/auth/session', { method: 'delete' }).then(() => {
        window.location.reload()
      })
    },
  }],
].filter(Boolean) as DropdownMenuItem[][])

const syncTooltipText = computed(() => {
  return preferences.value.syncEditorAndRoute
    ? t('studio.tooltips.unlinkEditor')
    : t('studio.tooltips.linkEditor')
})

function closeStudio() {
  unsetActiveLocation()
  ui.close()
}
</script>

<template>
  <div
    class="bg-muted/50 border-default border-t-[0.5px] flex items-center justify-between gap-1.5 px-2 py-2"
  >
    <span
      v-if="devMode"
      class="ml-2 text-xs text-muted"
    >
      Using local filesystem
    </span>
    <UDropdownMenu
      v-else
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
            :label="$t('studio.footer.developer_view')"
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
        :text="syncTooltipText"
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

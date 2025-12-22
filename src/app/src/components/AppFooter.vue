<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStudio } from '../composables/useStudio'
import { useStudioState } from '../composables/useStudioState'
import { useStudioUI } from '../composables/useStudioUI'
import type { DropdownMenuItem } from '@nuxt/ui/runtime/components/DropdownMenu.vue.d.ts'

const { ui: studioUI, host, gitProvider } = useStudio()
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
    slot: 'debug-mode' as const,
  }],
  [{
    label: t('studio.buttons.signOut'),
    icon: 'i-lucide-log-out',
    onClick: () => {
      fetch('/__nuxt_studio/auth/session', { method: 'delete' }).then(() => {
        host.app.unregisterServiceWorker()
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
  studioUI.close()
}

const { ui } = useStudioUI('footer')
</script>

<template>
  <div :class="ui.root">
    <span
      v-if="devMode"
      :class="ui.text"
    >
      {{ $t('studio.footer.localFilesystem') }}
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
      <template #debug-mode>
        <div
          :class="ui.debugSwitchContainer"
          @click.stop
        >
          <USwitch
            :model-value="preferences.debug"
            :label="$t('studio.footer.debugMode')"
            size="xs"
            :ui="ui.debugSwitch"
            @update:model-value="updatePreference('debug', $event)"
          />
        </div>
      </template>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        :avatar="{ src: user?.avatar, alt: user?.name, size: '2xs' }"
        :class="ui.userMenuButton"
        :label="user?.name"
      />
    </UDropdownMenu>

    <div :class="ui.actions">
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

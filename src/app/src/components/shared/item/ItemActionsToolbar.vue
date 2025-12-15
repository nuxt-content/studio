<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStudio } from '../../../composables/useStudio'
import { useStudioState } from '../../../composables/useStudioState'
import type { StudioAction } from '../../../types'
import { StudioItemActionId, TreeStatus } from '../../../types'
import { MEDIA_EXTENSIONS } from '../../../utils/file'
import type { DropdownMenuItem } from '@nuxt/ui/runtime/components/DropdownMenu.vue.d.ts'
import { useI18n } from 'vue-i18n'

const { context, gitProvider } = useStudio()
const { preferences, updatePreference } = useStudioState()
const { t } = useI18n()
const fileInputRef = ref<HTMLInputElement>()
const toolbarRef = ref<HTMLElement>()
const pendingAction = ref<StudioAction<StudioItemActionId> | null>(null)
const loadingAction = ref<StudioAction<StudioItemActionId> | null>(null)

watch(context.actionInProgress, (action) => {
  if (!action) {
    pendingAction.value = null
    loadingAction.value = null
  }

  if (action?.id === StudioItemActionId.UploadMedia) {
    fileInputRef.value?.click()
  }
})

const item = computed(() => context.activeTree.value.currentItem.value)

const extraActions = computed<DropdownMenuItem[]>(() => {
  const actions: DropdownMenuItem[] = []

  if (item.value.type === 'file') {
    const isConflictDetected = context.activeTree.value.draft.current.value?.conflict

    // Add editor mode switch for markdown files
    if (!isConflictDetected) {
      actions.push({
        label: preferences.value.editorMode === 'code'
          ? t('studio.actions.labels.switchToTipTap')
          : t('studio.actions.labels.switchToCode'),
        icon: preferences.value.editorMode === 'code' ? 'i-lucide-file-pen' : 'i-lucide-file-code',
        onClick: () => {
          updatePreference('editorMode', preferences.value.editorMode === 'code' ? 'tiptap' : 'code')
        },
      })
    }

    // Add git provider link for existing files
    if (item.value.status !== TreeStatus.Created) {
      const providerInfo = gitProvider.api.getRepositoryInfo()
      const provider = providerInfo.provider
      const feature = context.currentFeature.value

      if (feature) {
        actions.push({
          label: t(`studio.actions.labels.openGitProvider`, { providerName: gitProvider.name }),
          icon: provider === 'gitlab' ? 'i-simple-icons:gitlab' : 'i-simple-icons:github',
          to: gitProvider.api.getFileUrl(feature, item.value.fsPath),
          target: '_blank',
        })
      }
    }
  }

  return actions
})

const handleFileSelection = (event: Event) => {
  const target = event.target as HTMLInputElement

  if (target.files && target.files.length > 0) {
    context.itemActionHandler[StudioItemActionId.UploadMedia]({
      parentFsPath: item.value.fsPath,
      files: Array.from(target.files),
    })

    target.value = ''
  }
}

const handleClickOutside = () => {
  if (pendingAction.value !== null && loadingAction.value === null) {
    pendingAction.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    ref="toolbarRef"
    class="flex items-center -mr-1"
  >
    <ItemActionsDropdown
      :item="item"
      :extra-actions="extraActions"
    />

    <input
      ref="fileInputRef"
      type="file"
      multiple
      :accept="MEDIA_EXTENSIONS.map(ext => `.${ext}`).join(', ')"
      class="hidden"
      @change="handleFileSelection"
    >
  </div>
</template>

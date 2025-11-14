<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStudioState } from '../composables/useStudioState'
import { useRouter } from 'vue-router'

const { manifestId } = useStudioState()
const router = useRouter()

const previousManifestId = ref<string>(manifestId.value)
const showBanner = ref(false)
const isReloadingApp = ref(false)

watch(manifestId, (newId) => {
  if (router.currentRoute.value.name === 'success') {
    return
  }

  if (previousManifestId.value && previousManifestId.value !== newId) {
    showBanner.value = true
  }

  previousManifestId.value = manifestId.value
})

function handleReload() {
  isReloadingApp.value = true
  window.location.reload()
  setTimeout(() => {
    isReloadingApp.value = false
  }, 2000)
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="showBanner"
      class="sticky bottom-0 z-50 border-t border-default bg-gradient-to-r from-secondary/10 via-secondary/15 to-secondary/10 backdrop-blur-sm px-4 py-3"
    >
      <div class="flex items-center justify-between gap-4">
        <div class="flex-1 flex items-center gap-3">
          <div class="flex-shrink-0">
            <div class="flex items-center justify-center h-8 w-8 rounded-full bg-secondary/20">
              <UIcon
                name="i-lucide-bell-ring"
                class="w-4 h-4 text-secondary"
              />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-highlighted">
              {{ $t('studio.newVersionBanner.title') }}
            </p>
            <p class="text-xs text-muted mt-0.5">
              {{ $t('studio.newVersionBanner.description') }}
            </p>
          </div>
        </div>
        <UButton
          color="secondary"
          size="sm"
          leading-icon="i-lucide-refresh-cw"
          :loading="isReloadingApp"
          @click="handleReload"
        >
          {{ $t('studio.buttons.reload') }}
        </UButton>
      </div>
    </div>
  </Transition>
</template>

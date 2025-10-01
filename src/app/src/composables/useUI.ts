import { createSharedComposable, useStorage } from '@vueuse/core'
import { ref, watch } from 'vue'
import { type StudioHost, StudioFeature } from '../types'
import { useSidebar } from './useSidebar'

export const useUI = createSharedComposable((host: StudioHost) => {
  const config = useStorage('studio-ui-config', { syncEditorAndRoute: true })
  const sidebar = useSidebar()
  const isOpen = ref(false)
  const currentPanel = ref<StudioFeature | null>(null)

  watch(isOpen, (value) => {
    if (value) {
      host.ui.expandSidebar()
    }
    else {
      host.ui.collapseSidebar()
    }
  })

  return {
    config,
    sidebar,
    isOpen,
    currentPanel,
    open(panel?: StudioFeature) {
      currentPanel.value = panel || currentPanel.value || StudioFeature.Content
      isOpen.value = true
    },
    toggle: () => isOpen.value = !isOpen.value,
    close: () => isOpen.value = false,
  }
})

import { createSharedComposable, useStorage } from '@vueuse/core'
import { ref, watch } from 'vue'
import type { StudioHost, UIConfig } from '../types'
import { useSidebar } from './useSidebar'

export const useUI = createSharedComposable((host: StudioHost) => {
  const config = useStorage<UIConfig>('studio-ui-config', { syncEditorAndRoute: true, showTechnicalMode: false })
  const sidebar = useSidebar()
  const isOpen = ref(false)
  const colorMode = ref(host.ui.colorMode)

  host.on.colorModeChange((newColorMode) => {
    colorMode.value = newColorMode
  })

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
    colorMode,
    sidebar,
    isOpen,
    open() {
      isOpen.value = true
    },
    toggle: () => isOpen.value = !isOpen.value,
    close: () => isOpen.value = false,
  }
})

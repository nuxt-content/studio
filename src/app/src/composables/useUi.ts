import { createSharedComposable } from '@vueuse/core'
import { computed, reactive, watch } from 'vue'
import { type StudioHost, StudioFeature } from '../types'

export const useUi = createSharedComposable((host: StudioHost) => {
  const panels = reactive({
    [StudioFeature.Content]: true,
    [StudioFeature.Media]: false,
    [StudioFeature.Config]: false,
  })

  const isPanelOpen = computed(() => Object.values(panels).some(value => value))
  watch(isPanelOpen, (value) => {
    if (value) {
      host.ui.expandSidebar()
    }
    else {
      host.ui.collapseSidebar()
    }
  })

  function openPanel(openPanel: StudioFeature) {
    if (panels[openPanel]) {
      return
    }

    panels[openPanel] = true

    for (const panel of Object.keys(panels)) {
      if (panel !== openPanel) {
        panels[panel as keyof typeof panels] = false
      }
    }
  }

  function closePanels() {
    if (!isPanelOpen.value) {
      return
    }

    if (isPanelOpen.value) {
      for (const panel of Object.keys(panels)) {
        panels[panel as keyof typeof panels] = false
      }
    }
  }

  return {
    panels,
    isPanelOpen,
    openPanel,
    closePanels,
  }
})

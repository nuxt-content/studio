import { createSharedComposable } from '@vueuse/core'
import { computed } from 'vue'
import type { useUi } from './useUi'
import type { StudioHost } from '../types'

export const useContext = createSharedComposable((_host: StudioHost, ui: ReturnType<typeof useUi>) => {
  const currentFeature = computed<keyof typeof ui.panels | null>(() => Object.keys(ui.panels).find(key => ui.panels[key as keyof typeof ui.panels]) as keyof typeof ui.panels)

  return {
    feature: currentFeature,
  }
})

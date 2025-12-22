import { computed } from 'vue'
import { useStudio } from './useStudio'
import type { StudioUI } from '../types'

export function useStudioUI<K extends keyof StudioUI>(key: K) {
  const { host } = useStudio()

  const ui = computed(() => {
    return host.config.studio.ui[key]
  })

  return { ui }
}

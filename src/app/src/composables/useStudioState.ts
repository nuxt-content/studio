import { readonly, ref } from 'vue'
import { useStorage, createSharedComposable } from '@vueuse/core'
import type { StudioConfig, StudioLocation } from '../types'
import { StudioFeature } from '../types/context'

export const useStudioState = createSharedComposable(() => {
  const devMode = ref(false)
  const manifestId = ref<string>('')
  const preferences = useStorage<StudioConfig>('studio-preferences', { syncEditorAndRoute: true, showTechnicalMode: false })
  const location = useStorage<StudioLocation>('studio-active', { active: false, feature: StudioFeature.Content, fsPath: '/' })

  function setLocation(feature: StudioFeature, fsPath: string) {
    location.value = { active: true, feature, fsPath }
  }

  function unsetActiveLocation() {
    location.value.active = false
  }

  function setManifestId(id: string) {
    manifestId.value = id
  }

  function enableDevMode() {
    devMode.value = true
  }

  function updatePreference<K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) {
    preferences.value = { ...preferences.value, [key]: value }
  }

  return {
    devMode: readonly(devMode),
    manifestId: readonly(manifestId),
    preferences: readonly(preferences),
    location: readonly(location),
    enableDevMode,
    setLocation,
    unsetActiveLocation,
    setManifestId,
    updatePreference,
  }
})

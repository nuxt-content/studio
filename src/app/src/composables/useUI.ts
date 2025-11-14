import { createSharedComposable } from '@vueuse/core'
import { getCurrentInstance, ref, watch } from 'vue'
import type { StudioHost } from '../types'
import { useSidebar } from './useSidebar'

export const useUI = createSharedComposable((host: StudioHost) => {
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

  function setLocale(locale: string) {
    const currentVueInstance = getCurrentInstance()
    if (currentVueInstance) {
      import(`../locales/${locale}.json`).then((locales) => {
        const i18n = currentVueInstance.appContext.provides.i18n.global
        i18n.locale.value = locale
        i18n.setLocaleMessage(locale, locales.default)
      })
    }
  }

  return {
    colorMode,
    sidebar,
    isOpen,
    open() {
      isOpen.value = true
    },
    toggle: () => isOpen.value = !isOpen.value,
    close: () => isOpen.value = false,
    setLocale,
  }
})

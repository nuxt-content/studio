import { createSharedComposable } from './createSharedComposable'
import { ref, watch } from 'vue'
import type { StudioHost } from '../types'
import { useSidebar } from './useSidebar'
import { getStudioI18nGlobal } from '../utils/studioI18n'

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
    const i18n = getStudioI18nGlobal()
    if (!i18n) {
      return
    }

    if (i18n.availableLocales.includes(locale)) {
      i18n.locale.value = locale
      return
    }

    import(`../locales/${locale}.json`).then((locales) => {
      i18n.setLocaleMessage(locale, locales.default)
      i18n.locale.value = locale
    })
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

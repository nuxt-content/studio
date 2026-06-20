import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '../../../src/locales/en.json'
import { getStudioI18nGlobal, setStudioI18nGlobal } from '../../../src/utils/studioI18n'
import { useUI } from '../../../src/composables/useUI'
import { createMockHost } from '../../mocks/host'
import type { StudioHost } from '../../../src/types'

function createHost(defaultLocale: string): StudioHost {
  const host = createMockHost()
  return {
    ...host,
    meta: {
      ...host.meta,
      defaultLocale,
    },
  }
}

describe('useUI.setLocale', () => {
  it('activates an eager-loaded locale without a component context', () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en },
    })
    setStudioI18nGlobal(i18n.global)

    effectScope(true).run(() => {
      useUI(createHost('en')).setLocale('en')
    })

    expect(getStudioI18nGlobal()?.locale.value).toBe('en')
    expect(i18n.global.t('studio.nav.content')).toBe('Content')
    expect(i18n.global.t('studio.nav.media')).toBe('Media')
  })

  it('lazy-loads locale messages without a component context', async () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en },
    })
    setStudioI18nGlobal(i18n.global)

    effectScope(true).run(() => {
      useUI(createHost('fr')).setLocale('fr')
    })

    await vi.waitFor(() => {
      expect(i18n.global.availableLocales).toContain('fr')
    })

    expect(i18n.global.locale.value).toBe('fr')
    expect(i18n.global.t('studio.nav.content')).toBe('Contenu')
    expect(i18n.global.t('studio.nav.media')).toBe('Média')
  })
})

describe('studioI18n', () => {
  it('exposes the Studio i18n instance without a component context', () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en },
    })

    setStudioI18nGlobal(i18n.global)

    expect(getStudioI18nGlobal()).toBe(i18n.global)
    expect(getStudioI18nGlobal()?.availableLocales).toContain('en')
  })
})

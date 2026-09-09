export interface StudioI18nGlobal {
  locale: { value: string }
  availableLocales: string[]
  setLocaleMessage: (locale: string, message: unknown) => void
}

let studioI18nGlobal: StudioI18nGlobal | undefined

export function setStudioI18nGlobal(global: StudioI18nGlobal): void {
  studioI18nGlobal = global
}

export function getStudioI18nGlobal(): StudioI18nGlobal | undefined {
  return studioI18nGlobal
}

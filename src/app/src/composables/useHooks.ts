import { createSharedComposable } from '@vueuse/core'
import { createHooks } from 'hookable'

export const useHooks = createSharedComposable(() => {
  return createHooks<{
    'studio:draft:document:updated': () => void
    'studio:draft:media:updated': () => void
  }>()
})

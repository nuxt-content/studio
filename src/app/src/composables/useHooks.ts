import { createSharedComposable } from '@vueuse/core'
import { createHooks } from 'hookable'

export const useHooks = createSharedComposable(() => {
  return createHooks<{
    'studio:draft:document:updated': ({ caller }: { caller: string }) => void
    'studio:draft:media:updated': ({ caller }: { caller: string }) => void
  }>()
})

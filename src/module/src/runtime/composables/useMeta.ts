import { createSharedComposable } from '@vueuse/core'
import type { ComponentMeta } from 'nuxt-studio/app'
import { ref, shallowRef } from 'vue'

export const useHostMeta = createSharedComposable(() => {
  const componentsMeta = shallowRef<ComponentMeta[]>([])
  const meta = ref<ComponentMeta>()

  async function fetch() {
    // TODO: look into this approach and consider possible refactors
    const data = await $fetch<{ components: ComponentMeta[] }>('/__nuxt_content/studio/meta', {
      headers: { 'content-type': 'application/json' },
    }).catch(() => ({ components: [] }))

    componentsMeta.value = data.components || []
  }

  return {
    meta,
    fetch,
    componentsMeta,
  }
})

import { createSharedComposable } from '@vueuse/core'
import type { ComponentMeta } from 'nuxt-studio/app'
import { shallowRef } from 'vue'
import { kebabCase } from 'scule'

export const useHostMeta = createSharedComposable(() => {
  const components = shallowRef<ComponentMeta[]>([])

  async function fetch() {
    // TODO: look into this approach and consider possible refactors
    const data = await $fetch<{ components: ComponentMeta[] }>('/__nuxt_studio/meta', {
      headers: { 'content-type': 'application/json' },
    }).catch(() => ({ components: [] }))

    // Markdown elements to exclude (in kebab-case)
    const markdownElements = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'p', 'li', 'ul', 'ol', 'blockquote', 'code', 'code-block', 'image', 'video', 'link', 'hr', 'img', 'pre', 'em', 'bold', 'italic', 'strike', 'strong', 'tr', 'thead', 'tbody', 'tfoot', 'th', 'td'])

    const componentNames = new Set<string>()
    const filteredComponents: ComponentMeta[] = []

    for (const component of (data.components || [])) {
      // Skip .d.vue.ts files
      if (component.path.endsWith('.d.vue.ts')) continue

      // Remove "Prose" prefix
      const name = component.name.startsWith('Prose') ? component.name.slice(5) : component.name

      componentNames.add(name)

      filteredComponents.push({
        ...component,
        name,
      })
    }

    // Filter U-prefixed and markdown elements, then convert to kebab-case
    const result: ComponentMeta[] = []
    for (const component of filteredComponents) {
      // Remove duplicated U-prefixed components
      if (component.name.startsWith('U')) {
        const nameWithoutU = component.name.slice(1)
        if (componentNames.has(nameWithoutU) || result.some(c => c.name === component.name)) continue
      }

      // Convert to kebab-case
      const kebabName = kebabCase(component.name)

      // Remove duplicated components
      if (result.find(c => c.name === kebabName)) continue

      // Filter out markdown elements
      if (markdownElements.has(kebabName)) continue

      // Add component
      result.push({
        ...component,
        name: kebabName,
      })
    }

    components.value = result
  }

  return {
    fetch,
    components,
  }
})

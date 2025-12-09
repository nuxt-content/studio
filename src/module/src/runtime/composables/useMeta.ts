import { createSharedComposable } from '@vueuse/core'
import type { ComponentMeta } from 'nuxt-studio/app'
import { shallowRef } from 'vue'
import { kebabCase } from 'scule'

interface Meta {
  components: ComponentMeta[]
  highlightTheme: { default: string, dark?: string, light?: string }
}

const defaultMeta: Meta = {
  components: [],
  highlightTheme: { default: 'github-light', dark: 'github-dark' },
}

export const useHostMeta = createSharedComposable(() => {
  const components = shallowRef<ComponentMeta[]>([])
  const highlightTheme = shallowRef<Meta['highlightTheme']>()

  async function fetch() {
    // TODO: look into this approach and consider possible refactors
    const data = await $fetch<typeof defaultMeta>('/__nuxt_studio/meta', {
      headers: { 'content-type': 'application/json' },
    }).catch(() => defaultMeta)

    highlightTheme.value = data.highlightTheme

    // Markdown elements to exclude (in kebab-case)
    const markdownElements = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'p', 'li', 'ul', 'ol', 'blockquote', 'code', 'code-block', 'image', 'video', 'link', 'hr', 'img', 'pre', 'em', 'bold', 'italic', 'strike', 'strong', 'tr', 'thead', 'tbody', 'tfoot', 'th', 'td'])

    const renamedComponents: ComponentMeta[] = []

    for (const component of (data.components || [])) {
      // Remove "Prose" prefix
      let name = component.name
      if (component.name.startsWith('Prose')) {
        name = name.slice(5)
      }

      if (component.path.endsWith('.d.vue.ts')) {
        name = name.slice(0, -4)
      }

      renamedComponents.push({
        ...component,
        name,
      })
    }

    const processedComponents = new Map<string, ComponentMeta>()

    for (const component of renamedComponents) {
      // Remove duplicated U-prefixed components
      if (component.name.startsWith('U')) {
        const nameWithoutU = component.name.slice(1)
        if (renamedComponents.find(c => c.name === nameWithoutU)) continue
      }

      // Convert to kebab-case
      const kebabName = kebabCase(component.name)

      // Filter out markdown elements
      if (markdownElements.has(kebabName)) continue

      // Handle duplicates
      const existing = processedComponents.get(kebabName)
      if (existing) {
        if (existing.path.endsWith('.d.vue.ts')) {
          continue
        }

        // Prioritize .d.vue.ts versions for more accurate metadata
        processedComponents.set(kebabName, {
          ...component,
          name: kebabName,
        })

        continue
      }

      // Add component
      processedComponents.set(kebabName, {
        ...component,
        name: kebabName,
      })
    }

    components.value = Array.from(processedComponents.values())
  }

  return {
    fetch,
    components,
    highlightTheme,
  }
})

import { createSharedComposable } from '@vueuse/core'
import type { ComponentMeta } from 'nuxt-studio/app'
import { shallowRef } from 'vue'
import { kebabCase } from 'scule'

interface Meta {
  components: ComponentMeta[]
  highlightTheme: { default: string, dark?: string, light?: string }
  markdownConfig: {
    contentHeading?: boolean
  }
}

const defaultMeta: Meta = {
  components: [],
  highlightTheme: { default: 'github-light', dark: 'github-dark' },
  markdownConfig: {},
}

export const useHostMeta = createSharedComposable(() => {
  const components = shallowRef<ComponentMeta[]>([])
  const highlightTheme = shallowRef<Meta['highlightTheme']>()
  const markdownConfig = shallowRef<Meta['markdownConfig']>()

  async function fetch() {
    // TODO: look into this approach and consider possible refactors
    const data = await $fetch<typeof defaultMeta>('/__nuxt_studio/meta', {
      headers: { 'content-type': 'application/json' },
    }).catch(() => defaultMeta)

    highlightTheme.value = data.highlightTheme
    markdownConfig.value = data.markdownConfig

    // Markdown elements to exclude (in kebab-case)
    const markdownElements = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'p', 'li', 'ul', 'ol', 'blockquote', 'code', 'code-block', 'image', 'video', 'link', 'hr', 'img', 'pre', 'em', 'bold', 'italic', 'strike', 'strong', 'tr', 'thead', 'tbody', 'tfoot', 'th', 'td'])

    const renamedComponents: ComponentMeta[] = []

    // Clean Nuxt UI components name
    for (const component of (data.components || [])) {
      let name = component.name

      const nuxtUI = component.path.includes('@nuxt/ui')
      if (nuxtUI) {
        component.nuxtUI = true

        // Remove "Prose" prefix
        if (component.name.startsWith('Prose')) {
          name = name.slice(5)
        }

        if (component.path.endsWith('.d.vue.ts')) {
          name = name.slice(0, -4)
        }
      }

      renamedComponents.push({
        ...component,
        name,
      })
    }

    const processedComponents = new Map<string, ComponentMeta>()

    for (const component of renamedComponents) {
      // Remove duplicated U-prefixed components
      if (component.nuxtUI && component.name.startsWith('U')) {
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

    // For Nuxt UI components, merge callout props into shortcut components (tip, warning, note, caution)
    const calloutComponent = processedComponents.get('callout')
    if (calloutComponent?.meta?.props && calloutComponent.nuxtUI) {
      for (const shortcutName of ['tip', 'warning', 'note', 'caution']) {
        const shortcut = processedComponents.get(shortcutName)
        if (shortcut?.nuxtUI) {
          shortcut.meta.props = [...shortcut.meta.props, ...calloutComponent.meta.props]
        }
      }
    }

    components.value = Array.from(processedComponents.values())
  }

  return {
    fetch,
    components,
    highlightTheme,
    markdownConfig,
  }
})

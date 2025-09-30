import type { ComponentData } from 'nuxt-component-meta'

export interface ComponentMeta {
  name: string,
  path: string,
  meta: {
    props: ComponentData['meta']['props'],
    slots: ComponentData['meta']['slots'],
    events: ComponentData['meta']['events'],
  },
}

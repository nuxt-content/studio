<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
import { useSidebar } from '../composables/useSidebar'
import { useStudioUI } from '../composables/useStudioUI'

defineProps<{
  title?: string
  open: boolean
}>()

const { sidebarStyle } = useSidebar()

const { ui } = useStudioUI('layout')

function onBeforeEnter(el: Element) {
  const element = el as HTMLElement
  element.style.transform = 'translateX(-100%)'
  element.style.opacity = '0'
}

function onEnter(el: Element, done: () => void) {
  const element = el as HTMLElement

  element.style.transition = 'transform 0.3s ease'

  // Small delay for the browser to render the initial state (else transition is not applied on enter)
  setTimeout(() => {
    element.style.transform = 'translateX(0)'
    element.style.opacity = '1'
  }, 10)

  setTimeout(done, 300)
}

function onLeave(el: Element, done: () => void) {
  const element = el as HTMLElement

  element.style.transition = 'transform 0.3s ease'
  element.style.transform = 'translateX(-100%)'

  setTimeout(done, 300)
}
</script>

<template>
  <Transition
    :css="false"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @leave="onLeave"
  >
    <div
      v-if="open"
      :class="ui.sidebar"
      :style="sidebarStyle"
    >
      <!-- This is needed for the Monaco editor to be able to position the portal correctly -->
      <div :class="ui.monaco">
        <div id="monaco-portal" />
      </div>

      <AppHeader />

      <div :class="ui.body">
        <slot />
      </div>

      <AppBanner />
      <AppFooter />

      <AppResizeHandle />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
import { useSidebar } from '../composables/useSidebar'

defineProps<{
  title?: string
  open: boolean
}>()

const { sidebarStyle } = useSidebar()

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
      class="fixed top-0 bottom-0 left-0 border-r border-default flex flex-col max-w-full bg-default"
      :style="sidebarStyle"
    >
      <!-- This is needed for the Monaco editor to be able to position the portal correctly -->
      <div class="monaco-editor">
        <div id="monaco-portal" />
      </div>

      <AppHeader />

      <div class="flex-1 overflow-y-auto relative">
        <slot />
      </div>

      <AppBanner />
      <AppFooter />

      <AppResizeHandle />
    </div>
  </Transition>
</template>

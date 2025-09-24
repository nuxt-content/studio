<script setup lang="ts">
import { useStudio } from './composables/useStudio'
import { useSidebar } from './composables/useSidebar'
import { watch } from 'vue'

const { sidebarWidth } = useSidebar()
const { ui, host, isReady } = useStudio()
watch(sidebarWidth, () => {
  if (ui.isPanelOpen.value) {
    host.ui.updateStyles()
  }
})
// const activeDocuments = ref<{ id: string, label: string, value: string }[]>([])

// function detectActiveDocuments() {
//   activeDocuments.value = host.document.detectActives().map((content) => {
//     return {
//       id: content.id,
//       label: content.title,
//       value: content.id,
//       onSelect: () => {
//         onContentSelect(content.id)
//       },
//     }
//   })
// }

// host.on.mounted(() => {
//   detectActiveDocuments()
//   host.on.routeChange(() => {
//     setTimeout(() => {
//       detectActiveDocuments()
//     }, 100)
//   })
// })
</script>

<template>
  <Suspense>
    <UApp
      v-if="isReady"
      :toaster="{ portal: false }"
    >
      <PanelBase v-model="ui.isPanelOpen.value">
        <template #header>
          <PanelBaseSubHeader />
        </template>

        <PanelBaseBody />
      </PanelBase>

      <!-- Floating Files Panel Toggle -->
      <UButton
        v-if="!ui.isPanelOpen.value"
        icon="i-lucide-panel-left-open"
        size="lg"
        color="primary"
        class="fixed bottom-4 left-4 z-50 shadow-lg"
        @click="ui.panels.content = true"
      />
    </UApp>
  </Suspense>
</template>

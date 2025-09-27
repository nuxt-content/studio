<script setup lang="ts">
import { useStudio } from './composables/useStudio'
import { useSidebar } from './composables/useSidebar'
import { watch, ref } from 'vue'
import { StudioFeature } from './types'

const { sidebarWidth } = useSidebar()
const { ui, host, isReady, documentTree } = useStudio()

watch(sidebarWidth, () => {
  if (ui.isPanelOpen.value) {
    host.ui.updateStyles()
  }
})
const activeDocuments = ref<{ id: string, title: string }[]>([])

function detectActiveDocuments() {
  activeDocuments.value = host.document.detectActives().map((content) => {
    return {
      id: content.id,
      title: content.title,
    }
  })
}

async function onContentSelect(id: string) {
  await documentTree.selectItemById(id)
  ui.openPanel(StudioFeature.Content)
}

host.on.mounted(() => {
  detectActiveDocuments()
  host.on.routeChange(() => {
    setTimeout(() => {
      detectActiveDocuments()
    }, 100)
  })
})
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
      <div
        v-if="!ui.isPanelOpen.value"
        class="fixed bottom-4 left-4 z-50 flex gap-2"
      >
        <UButton
          icon="i-lucide-panel-left-open"
          size="lg"
          color="primary"
          class="shadow-lg"
          @click="ui.panels.content = true"
        />
        <UButton
          v-if="activeDocuments.length === 1"
          icon="i-lucide-file-text"
          size="lg"
          variant="outline"
          label="Edit This Page"
          class="shadow-lg bg-white hover:bg-gray-100"
          @click="onContentSelect(activeDocuments[0].id)"
        />
      </div>
    </UApp>
  </Suspense>
</template>

<script setup lang="ts">
import { useStudio } from './composables/useStudio'
import { watch, ref } from 'vue'
import { StudioFeature } from './types'
import { defineShortcuts } from '#imports'
import { useRouter } from 'vue-router'

const { host, ui, isReady, documentTree } = useStudio()
const router = useRouter()

defineShortcuts({
  'meta_.': () => {
    ui.toggle()
  },
})

watch(ui.sidebar.sidebarWidth, () => {
  if (ui.isOpen.value) {
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

async function editContentFile(id: string) {
  await documentTree.selectItemById(id)
  ui.open(StudioFeature.Content)
}

host.on.mounted(() => {
  detectActiveDocuments()
  host.on.routeChange(() => {
    setTimeout(() => {
      detectActiveDocuments()
    }, 100)
  })
})

const direction = ref<'left' | 'right'>('left')
const directionOrder = ['content', 'media']

router.beforeEach((to, from) => {
  direction.value = directionOrder.indexOf(from.name as string) > directionOrder.indexOf(to.name as string) ? 'left' : 'right'
})
</script>

<template>
  <div :class="ui.colorMode.value">
    <UApp
      :toaster="{ portal: false }"
      :modal="{ portal: false }"
    >
      <AppLayout :open="ui.isOpen.value">
        <RouterView v-slot="{ Component }">
          <Transition
            enter-active-class="transition-translate duration-200 absolute"
            :enter-from-class="direction === 'right' ? 'translate-x-full' : '-translate-x-full'"
            enter-to-class="translate-x-0"
            leave-active-class="transition-translate duration-200 absolute"
            leave-from-class="translate-x-0"
            :leave-to-class="direction === 'right' ? '-translate-x-full' : 'translate-x-full'"
          >
            <KeepAlive>
              <component
                :is="Component"
                class="w-full h-full"
              />
            </KeepAlive>
          </Transition>
        </RouterView>
      </AppLayout>

      <!-- Floating Files Panel Toggle -->
      <div
        class="fixed bottom-2 left-2 flex transition-all"
        :class="[isReady && !ui.isOpen.value ? 'opacity-100 duration-200 delay-300 translate-y-0' : 'duration-0 opacity-0 -translate-x-12 pointer-events-none']"
      >
        <UFieldGroup>
          <UTooltip
            text="Toggle Studio"
            :kbds="['meta', '.']"
          >
            <UButton
              icon="i-lucide-panel-left-open"
              size="sm"
              color="neutral"
              variant="outline"
              class="bg-transparent backdrop-blur-md"
              @click="ui.open()"
            />
          </UTooltip>
          <UButton
            v-if="activeDocuments.length === 1"
            size="sm"
            color="neutral"
            variant="outline"
            class="bg-transparent backdrop-blur-md px-2"
            label="Edit this page"
            @click="editContentFile(activeDocuments[0].id)"
          />
        </UFieldGroup>
      </div>
    </UApp>
  </div>
</template>

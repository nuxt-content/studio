<script setup lang="ts">
import { useStudio } from './composables/useStudio'
import { watch, ref } from 'vue'
import { useRouter } from 'vue-router'

const { host, ui, isReady, context } = useStudio()
const router = useRouter()

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore defineShortcuts is auto-imported
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
  await context.activeTree.value.selectItemById(id)
  ui.open()
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
const isReviewTransition = ref(false)
const directionOrder = ['content', 'media']

router.beforeEach((to, from) => {
  if (to.name === 'review' || from.name === 'review') {
    isReviewTransition.value = true
  }
  else {
    isReviewTransition.value = false
    direction.value = directionOrder.indexOf(from.name as string) > directionOrder.indexOf(to.name as string) ? 'left' : 'right'
  }
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
            v-if="isReviewTransition"
            enter-active-class="transition-translate duration-200 absolute"
            enter-from-class="-translate-y-full"
            enter-to-class="translate-y-0"
            leave-active-class="transition-translate duration-200 absolute"
            leave-from-class="translate-y-0"
            leave-to-class="-translate-y-full"
          >
            <KeepAlive>
              <component
                :is="Component"
                class="w-full h-full"
              />
            </KeepAlive>
          </Transition>
          <Transition
            v-else
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

<script setup lang="ts">
import type { TreeItem } from '../../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { Image } from '@unpic/vue'
import { titleCase } from 'scule'
import { COLOR_STATUS_MAP } from '../../../utils/draft'

const props = defineProps({
  file: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
  // ongoingFileAction: {
  //   type: Object as PropType<FileAction>,
  //   default: null,
  // },
  // readOnly: {
  //   type: Boolean,
  //   default: false,
  // },
  // disableHover: {
  //   type: Boolean,
  //   default: false,
  // },
  // isDragged: {
  //   type: Boolean,
  //   default: false,
  // },
  // isHovered: {
  //   type: Boolean,
  //   default: false,
  // },
})

const isFolder = computed(() => props.file.type === 'directory')
const name = computed(() => titleCase(props.file.name))

const fileExtensionIcon = computed(() => {
  const ext = props.file.id.split('.').pop()?.toLowerCase() || ''
  return {
    md: 'i-ph-markdown-logo',
    yaml: 'i-fluent-document-yml-20-regular',
    yml: 'i-fluent-document-yml-20-regular',
    json: 'i-lucide-file-json',
  }[ext] || 'i-mdi-file'
})

// Safelist status colors: ring-red-100, ring-green-100, ring-orange-100, ring-blue-100
const statusColor = computed(() => props.file.status ? COLOR_STATUS_MAP[props.file.status] : 'gray')

// const { computeFileActions } = useProjectContext(project.value)
// const loaded = ref(false)

// const { data: url } = useAsyncData<string>(`screenshot-url-${project.value.id}-${props.file.pathRoute}`, async () => {
//   if (props.file.pathRoute && project.value.url) {
//     const path = props.file.pathRoute.replace('index', '')
//     return await client(`/screenshots/${project.value.id}/${encodeURIComponent(path)}`)
//   }
// })

// const name = computed(() => {
//   if (props.file.type === 'directory') {
//     return titleCase(props.file.nameWithoutPrefix || props.file.name.replace(/^\d+\./, ''))
//   }

//   // Remove extension
//   const fileName = (props.file.nameWithoutPrefix || props.file.name.replace(/^\d+\./, '')).split('.').slice(0, -1).join('.')

//   // Handle index files
//   if (fileName === 'index') {
//     const pathParts = props.file.pathWithoutRoot.split('/')
//     // Return home for index file
//     if (pathParts.length === 1) {
//       return 'Home.home'
//     }

//     // Else return parent name without prefix
//     return titleCase(pathParts[pathParts.length - 2].replace(/^\d+\./, '')) + '.home'
//   }

//   return titleCase(fileName)
// })

// const imgUrl = computed(() => url.value ? `${url.value}?theme=${colorMode.value}` : null)

// const isFolder = computed(() => props.file.type === 'directory')
// const actionItems = computed(() => computeFileActions(props.file))

// const ongoingFileRename = computed(() => props.ongoingFileAction?.action === 'rename-file' && props.ongoingFileAction.path === props.file.path)

// const ring = computed(() => {
//   const color = COLOR_STATUS_MAP[props.file.status] || 'gray'

//   if (ongoingFileRename.value) return `ring-2 ring-primary-400 dark:ring-primary-600`

//   const hover = props.disableHover ? '' : 'hover:ring-2 hover:ring-primary-400 dark:hover:ring-primary-600'
//   const dragged = props.isDragged ? `ring-0 border-2 border-dashed border-${color}-200 dark:border-${color}-400` : ''
//   const basic = color === 'gray' ? 'ring-gray-200 color-gray-800' : `ring-${color}-200 dark:ring-${color}-400`

//   return `ring-1 ${basic} ${hover} ${dragged}`
// })
</script>

<template>
  <UPageCard
    reverse
    class="cursor-pointer hover:ring-gray-300 hover:dark:ring-gray-700 relative"
  >
    <div
      v-if="!file.status"
      class="absolute top-2 right-2 z-10 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900"
      :class="`bg-${statusColor}-500`"
    />
    <div
      v-if="file.type === 'file'"
      class="relative"
    >
      <Image
        src="https://placehold.co/1920x1080/f9fafc/f9fafc"
        width="426"
        height="240"
        alt="Card placeholder"
        class="z-[-1] rounded-t-lg"
      />
      <div class="absolute inset-0 flex items-center justify-center">
        <UIcon
          :name="fileExtensionIcon"
          class="w-8 h-8 text-gray-400 dark:text-gray-500"
        />
      </div>
    </div>

    <template #body>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-1 min-w-0">
          <UIcon
            v-if="isFolder"
            name="i-lucide-folder"
            class="h-4 w-4"
          />
          <UIcon
            v-else-if="name === 'home'"
            name="i-lucide-house"
            class="h-4 w-4"
          />
          <h3
            class="text-sm font-semibold truncate"
            :class="props.file.status === 'deleted' && 'line-through'"
          >
            {{ name }}
          </h3>
        </div>
        <!-- <UDropdown
          v-if="!readOnly && isFolder"
          class="hidden group-hover:block"
          :items="actionItems"
          :popper="{ strategy: 'absolute' }"
          @click="$event.stopPropagation()"
        >
          <UButton
            color="gray"
            variant="ghost"
            aria-label="Open items"
            icon="i-ph-dots-three-vertical"
            square
          />
        </UDropdown> -->
        <FileBadge
          v-if="file.status"
          :status="file.status"
        />
      </div>

      <UTooltip :text="file.path">
        <span class="truncate leading-relaxed text-xs text-gray-400 dark:text-gray-500">
          {{ file.pagePath || file.path }}
        </span>
      </UTooltip>
    </template>
    <!-- <template
      v-if="file.type === 'file'"
      #header
    >
      <div
        v-if="url && file.status !== 'created'"
        class="relative"
      >
        <USkeleton
          v-if="!loaded"
          class="absolute inset-0 rounded-none bg-gray-300 dark:bg-gray-700 rounded-t-lg"
        />
        <NuxtImg
          v-if="url"
          :src="imgUrl"
          width="695"
          height="390"
          class="z-[-1] rounded-t-lg"
          @error="url = null"
          @load="loaded = true"
        />
      </div>
      <div
        v-else
        class="relative"
      >
        <NuxtImg
          :src="placeholder"
          width="695"
          height="390"
          class="z-[-1] rounded-t-lg"
        />
        <div
          class="absolute inset-0 flex items-center justify-center"
        >
          <UIcon
            :name="icon"
            class="w-8 h-8 text-gray-400 dark:text-gray-500"
          />
        </div>
      </div>
      <UDropdown
        v-if="!readOnly"
        :items="actionItems"
        class="hidden group-hover:block absolute top-2 right-2"
        :popper="{ strategy: 'absolute' }"
        @click="$event.stopPropagation()"
      >
        <UButton
          color="white"
          variant="solid"
          aria-label="Open actions"
          icon="i-ph-dots-three-vertical"
          square
        />
      </UDropdown>
    </template> -->
  </UPageCard>
</template>

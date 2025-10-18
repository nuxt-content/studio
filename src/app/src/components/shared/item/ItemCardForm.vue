<script setup lang="ts">
import { computed, reactive, ref, type PropType, onMounted, onUnmounted } from 'vue'
import * as z from 'zod'
import type {
  CreateFileParams,
  RenameFileParams,
  StudioAction,
  TreeItem,
  ExtensionConfig,
  CreateFolderParams,
} from '../../../types'
import { StudioItemActionId } from '../../../types'
import { joinURL, withLeadingSlash, withoutLeadingSlash } from 'ufo'
import { useStudio } from '../../../composables/useStudio'
import { parseName, getFileExtension, CONTENT_EXTENSIONS, MEDIA_EXTENSIONS } from '../../../utils/file'
import { upperFirst } from 'scule'

const { context } = useStudio()

const isLoading = ref(false)
const formRef = ref<HTMLDivElement>()

const props = defineProps({
  actionId: {
    type: String as PropType<StudioItemActionId.CreateDocument | StudioItemActionId.RenameItem | StudioItemActionId.CreateFolder>,
    required: true,
  },
  parentItem: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
  renamedItem: {
    type: Object as PropType<TreeItem>,
    default: null,
  },
  config: {
    type: Object as PropType<ExtensionConfig>,
    required: true,
  },
})

const isDirectory = computed(() => props.renamedItem?.type === 'directory' || props.actionId === StudioItemActionId.CreateFolder)
const action = computed<StudioAction<StudioItemActionId>>(() => context.itemActions.value.find(action => action.id === props.actionId)!)
const originalName = computed(() => props.renamedItem?.name === 'home' ? 'index' : props.renamedItem?.name || '')
const originalExtension = computed(() => {
  if (isDirectory.value) {
    return null
  }

  return props.renamedItem ? getFileExtension(props.renamedItem?.fsPath) : props.config.default
})
const originalPrefix = computed(() => props.renamedItem?.prefix || null)

const schema = z.object({
  name: z.string()
    .min(1, 'Name cannot be empty')
    .refine((name: string) => !name.endsWith('.'), 'Name cannot end with "."')
    .refine((name: string) => !name.startsWith('/'), 'Name cannot start with "/"'),
  extension: z.enum([...CONTENT_EXTENSIONS, ...MEDIA_EXTENSIONS] as [string, ...string[]]).nullish(),
  prefix: z.number().int().positive().nullish(),
})

type Schema = z.output<typeof schema>
const state = reactive<Schema>({
  name: originalName.value,
  extension: originalExtension.value,
  prefix: originalPrefix.value,
})

const routePath = computed(() => {
  const name = state.name === 'index' ? '/' : state.name
  const routePath = props.config.editable ? name : `${name}.${state.extension}`
  return withLeadingSlash(joinURL(props.parentItem.routePath!, parseName(routePath).name))
})

const displayInfo = computed(() => {
  if (isDirectory.value) {
    return `${props.renamedItem?.children?.length || 0} items`
  }
  return routePath.value
})

const tooltipText = computed(() => {
  if (props.actionId === StudioItemActionId.RenameItem) {
    return 'Rename'
  }
  else {
    return 'Create file'
  }
})

const handleClickOutside = (event: MouseEvent) => {
  if (formRef.value && !formRef.value.contains(event.target as Node)) {
    context.unsetActionInProgress()
  }
}

onMounted(() => {
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 0)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

async function onSubmit() {
  if (isLoading.value) return

  isLoading.value = true

  let params: CreateFileParams | RenameFileParams | CreateFolderParams
  const baseName = state.name
  const prefixedName = state.prefix ? `${state.prefix}.${baseName}` : baseName
  const name = isDirectory.value ? prefixedName : `${prefixedName}.${state.extension}`
  const newFsPath = withoutLeadingSlash(joinURL(props.parentItem.fsPath, name))

  if (newFsPath === props.renamedItem?.fsPath) {
    isLoading.value = false
    context.unsetActionInProgress()
    return
  }

  switch (props.actionId) {
    case StudioItemActionId.CreateDocument:
      params = {
        fsPath: newFsPath,
        content: `# ${upperFirst(baseName)} file`,
      }
      break
    case StudioItemActionId.RenameItem:
      params = {
        newFsPath: newFsPath,
        id: props.renamedItem.id,
      }
      break
    case StudioItemActionId.CreateFolder:
      params = {
        fsPath: newFsPath,
      }
      break
  }

  try {
    await action.value.handler!(params)
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    @submit="onSubmit"
  >
    <template #default="{ errors }">
      <div
        ref="formRef"
        @click.stop
      >
        <UPageCard
          reverse
          :class="{ 'animate-pulse': isLoading }"
          class="hover:bg-white relative w-full min-w-0 overflow-hidden"
          :ui="{ container: 'overflow-hidden' }"
        >
          <template #body>
            <div class="flex items-start gap-3">
              <div
                v-if="!isDirectory"
                class="relative flex-shrink-0 w-12 h-12"
              >
                <div class="w-full h-full bg-size-[24px_24px] bg-position-[0_0,0_12px,12px_-12px,-12px_0] rounded-lg overflow-hidden bg-elevated">
                  <slot name="thumbnail" />
                </div>
              </div>

              <div class="flex flex-col gap-1 flex-1 min-w-0">
                <div class="flex items-center gap-1">
                  <UFormField
                    name="prefix"
                    :ui="{ error: 'hidden' }"
                    class="w-12"
                  >
                    <template #error>
                      <span />
                    </template>
                    <UInput
                      v-model.number="state.prefix"
                      type="number"
                      variant="soft"
                      placeholder="No."
                      min="1"
                      class="h-5"
                      size="xs"
                      :disabled="isLoading"
                    />
                  </UFormField>
                  <UFormField
                    name="name"
                    :ui="{ error: 'hidden' }"
                    class="flex-1 min-w-0"
                  >
                    <!-- TODO: should use :error="false" when fixed -->
                    <template #error>
                      <span />
                    </template>
                    <UInput
                      v-model="state.name"
                      variant="soft"
                      autofocus
                      placeholder="File name"
                      class="w-full h-5"
                      size="xs"
                      :disabled="isLoading"
                      @keydown.esc="context.unsetActionInProgress"
                    />
                  </UFormField>
                  <UFormField
                    v-if="!isDirectory"
                    name="extension"
                    :ui="{ error: 'hidden' }"
                  >
                    <!-- TODO: should use :error="false" when fixed -->
                    <template #error>
                      <span />
                    </template>
                    <USelect
                      v-model="state.extension"
                      :items="config.allowed"
                      :disabled="!config.editable || isLoading"
                      variant="soft"
                      class="w-18 h-5"
                      size="xs"
                    />
                  </UFormField>
                </div>

                <UTooltip :text="displayInfo">
                  <span class="truncate leading-relaxed text-xs text-dimmed block w-full">
                    {{ displayInfo }}
                  </span>
                </UTooltip>
              </div>

              <div class="flex-shrink-0 flex gap-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-ph-x"
                  aria-label="Cancel"
                  size="xs"
                  square
                  :disabled="isLoading"
                  @click="context.unsetActionInProgress"
                />

                <UTooltip
                  :text="errors.length > 0 ? errors[0]?.message : tooltipText"
                  :popper="{ strategy: 'absolute' }"
                >
                  <UButton
                    type="submit"
                    variant="soft"
                    :color="errors.length > 0 ? 'error' : 'secondary'"
                    aria-label="Submit button"
                    :disabled="errors.length > 0 || isLoading"
                    :loading="isLoading"
                    size="xs"
                    square
                  >
                    <UIcon
                      v-if="!isLoading"
                      name="i-ph-check"
                      class="size-4"
                    />
                  </UButton>
                </UTooltip>
              </div>
            </div>
          </template>
        </UPageCard>
      </div>
    </template>
  </UForm>
</template>

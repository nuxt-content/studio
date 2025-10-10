<script setup lang="ts">
import { computed, reactive, ref, type PropType } from 'vue'
import * as z from 'zod'
import type {
  MediaFileExtension,
  CreateFileParams,
  RenameFileParams,
  StudioAction,
  TreeItem,
} from '../../../types'
import { ContentFileExtension, StudioItemActionId } from '../../../types'
import { joinURL, withLeadingSlash, withoutLeadingSlash } from 'ufo'
import { useStudio } from '../../../composables/useStudio'
import { stripNumericPrefix } from '../../../utils/string'
import { upperFirst } from 'scule'
import { getFileExtension, CONTENT_EXTENSIONS, isMediaFile, MEDIA_EXTENSIONS } from '../../../utils/file'

const { context } = useStudio()

const isLoading = ref(false)

const props = defineProps({
  actionId: {
    type: String as PropType<StudioItemActionId.CreateDocument | StudioItemActionId.RenameItem>,
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
})

const action = computed<StudioAction>(() => context.itemActions.value.find(action => action.id === props.actionId)!)
const originalName = computed(() => props.renamedItem?.name === 'home' ? 'index' : props.renamedItem?.name || '')
const isMedia = computed(() => props.renamedItem && isMediaFile(props.renamedItem?.fsPath))
const originalExtension = computed(() => {
  if (isMedia.value) {
    return props.renamedItem ? getFileExtension(props.renamedItem?.fsPath) : null
  }

  return props.renamedItem ? getFileExtension(props.renamedItem?.fsPath) : ContentFileExtension.Markdown
})

const schema = z.object({
  name: z.string()
    .min(1, 'Name cannot be empty')
    .refine((name: string) => !name.endsWith('.'), 'Name cannot end with "."')
    .refine((name: string) => !name.startsWith('/'), 'Name cannot start with "/"'),
  extension: z.enum([...CONTENT_EXTENSIONS, ...MEDIA_EXTENSIONS]).nullish(),
})

type Schema = z.output<typeof schema>
const state = reactive<Schema>({
  name: originalName.value,
  extension: originalExtension.value! as MediaFileExtension | ContentFileExtension | null,
})

const itemExtensionIcon = computed<string>(() => {
  return {
    md: 'i-ph-markdown-logo',
    yaml: 'i-fluent-document-yml-20-regular',
    yml: 'i-fluent-document-yml-20-regular',
    json: 'i-lucide-file-json',
  }[state.extension as string] || 'i-mdi-file'
})

const routePath = computed(() => {
  const path = state.name === 'index' ? '/' : state.name
  return withLeadingSlash(joinURL(props.parentItem.routePath!, stripNumericPrefix(path)))
})

const tooltipText = computed(() => {
  if (props.actionId === StudioItemActionId.RenameItem) {
    return 'Rename'
  }
  else {
    return 'Create file'
  }
})

async function onSubmit() {
  if (isLoading.value) return

  isLoading.value = true

  let params: CreateFileParams | RenameFileParams
  const newFsPath = joinURL(props.parentItem.fsPath, `${state.name}.${state.extension}`)

  switch (props.actionId) {
    case StudioItemActionId.CreateDocument:
      params = {
        fsPath: withoutLeadingSlash(newFsPath),
        content: `# ${upperFirst(state.name)} file`,
      }
      break
    case StudioItemActionId.RenameItem:
      params = {
        newFsPath: withoutLeadingSlash(newFsPath),
        id: props.renamedItem.id,
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
      <UPageCard
        reverse
        class="hover:bg-white relative w-full min-w-0 overflow-hidden"
        :class="{ 'animate-pulse': isLoading }"
        :ui="{ container: 'overflow-hidden' }"
      >
        <template #body>
          <div class="flex items-start gap-3">
            <div class="relative flex-shrink-0 w-12 h-12">
              <div class="w-full h-full bg-default bg-[linear-gradient(45deg,#e6e9ea_25%,transparent_0),linear-gradient(-45deg,#e6e9ea_25%,transparent_0),linear-gradient(45deg,transparent_75%,#e6e9ea_0),linear-gradient(-45deg,transparent_75%,#e6e9ea_0)] bg-size-[24px_24px] bg-position-[0_0,0_12px,12px_-12px,-12px_0] rounded-lg overflow-hidden">
                <div class="w-full h-full bg-elevated flex items-center justify-center">
                  <UIcon
                    :name="itemExtensionIcon"
                    class="w-6 h-6 text-muted"
                  />
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1 flex-1 min-w-0">
              <div class="flex items-center gap-1">
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
                  name="extension"
                  :ui="{ error: 'hidden' }"
                >
                  <!-- TODO: should use :error="false" when fixed -->
                  <template #error>
                    <span />
                  </template>
                  <USelect
                    v-model="state.extension"
                    :items="isMedia ? MEDIA_EXTENSIONS : CONTENT_EXTENSIONS"
                    :disabled="isMedia || isLoading"
                    variant="soft"
                    class="w-18 h-5"
                    size="xs"
                  />
                </UFormField>
              </div>

              <UTooltip :text="routePath">
                <span class="truncate leading-relaxed text-xs text-dimmed block w-full">
                  {{ routePath }}
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
    </template>
  </UForm>
</template>

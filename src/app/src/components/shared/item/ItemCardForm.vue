<script setup lang="ts">
import { computed, reactive, type PropType } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { type CreateFileParams, type CreateFolderParams, type RenameFileParams, type StudioAction, type TreeItem, ContentFileExtension } from '../../../types'
import { joinURL, withLeadingSlash, withoutLeadingSlash } from 'ufo'
import { contentFileExtensions } from '../../../utils/content'
import { useStudio } from '../../../composables/useStudio'
import { StudioItemActionId } from '../../../types'
import { stripNumericPrefix } from '../../../utils/string'
import { defineShortcuts } from '#imports'
import { upperFirst } from 'scule'

const { context } = useStudio()

defineShortcuts({
  escape: () => {
    context.unsetActionInProgress()
  },
})

const props = defineProps({
  actionId: {
    type: String as PropType<StudioItemActionId.CreateDocument | StudioItemActionId.CreateFolder | StudioItemActionId.RenameItem>,
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

const originalName = computed(() => props.renamedItem?.name || '')
const originalExtension = computed(() => props.renamedItem?.id.split('.').pop() as ContentFileExtension || ContentFileExtension.Markdown)

const schema = z.object({
  name: z.string()
    .min(1, 'Name cannot be empty')
    .refine((name: string) => !name.endsWith('.'), 'Name cannot end with "."')
    .refine((name: string) => !name.startsWith('/'), 'Name cannot start with "/"'),
  extension: z.enum(ContentFileExtension),
})

type Schema = z.output<typeof schema>
const state = reactive<Schema>({
  name: originalName.value,
  extension: originalExtension.value,
})

const action = computed<StudioAction>(() => {
  return context.itemActions.value.find(action => action.id === props.actionId)!
})

const isFolderAction = computed(() => {
  return props.actionId === StudioItemActionId.CreateFolder
    || (
      props.actionId === StudioItemActionId.RenameItem
      && props.renamedItem.type === 'directory'
    )
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
  return withLeadingSlash(joinURL(props.parentItem.routePath!, stripNumericPrefix(state.name)))
})

const tooltipText = computed(() => {
  if (props.actionId === StudioItemActionId.RenameItem) {
    return 'Rename'
  }
  else if (props.actionId === StudioItemActionId.CreateFolder) {
    return 'Create folder'
  }
  else {
    return 'Create file'
  }
})

function onSubmit(_event: FormSubmitEvent<Schema>) {
  let params: CreateFileParams | CreateFolderParams | RenameFileParams
  switch (props.actionId) {
    case StudioItemActionId.CreateDocument:
      params = {
        fsPath: withoutLeadingSlash(joinURL(props.parentItem.fsPath, `${state.name}.${state.extension}`)),
        content: `# ${upperFirst(state.name)} file`,
      }
      break
    case StudioItemActionId.CreateFolder:
      params = {
        fsPath: withoutLeadingSlash(joinURL(props.parentItem.fsPath, state.name)),
      }
      break
    case StudioItemActionId.RenameItem:
      params = {
        newFsPath: withoutLeadingSlash(joinURL(props.parentItem.fsPath, `${state.name}.${state.extension}`)),
        id: props.renamedItem.id,
      }
      break
  }

  action.value.handler!(params)
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
        class="hover:bg-white relative w-full min-w-0"
      >
        <div
          v-if="!isFolderAction"
          class="relative"
        >
          <div class="z-[-1] aspect-video rounded-lg bg-elevated" />
          <div class="absolute inset-0 flex items-center justify-center">
            <UIcon
              :name="itemExtensionIcon"
              class="w-8 h-8 text-gray-400 dark:text-gray-500"
            />
          </div>
          <div class="absolute top-2 right-2">
            <div class="flex">
              <UButton
                variant="ghost"
                icon="i-ph-x"
                aria-label="Close"
                @click="context.unsetActionInProgress"
              />

              <UTooltip
                :text="errors.length > 0 ? errors[0]?.message : tooltipText"
                :popper="{ strategy: 'absolute' }"
              >
                <UButton
                  type="submit"
                  variant="ghost"
                  aria-label="Submit button"
                  :disabled="errors.length > 0"
                  class="p-1.5"
                >
                  <UIcon
                    name="i-ph-check"
                    :color="errors.length > 0 ? 'red' : 'green'"
                    class="size-4"
                  />
                </UButton>
              </UTooltip>
            </div>
          </div>
        </div>

        <template #body>
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between gap-1">
              <UFormField
                name="name"
                :ui="{ error: 'hidden' }"
                class="flex-1"
              >
                <!-- TODO: should use :error="false" when fixed -->
                <template #error>
                  <span />
                </template>
                <div class="flex items-center gap-1">
                  <UIcon
                    v-if="isFolderAction"
                    name="i-lucide-folder"
                    class="h-4 w-4 shrink-0 text-muted"
                  />
                  <UInput
                    v-model="state.name"
                    variant="soft"
                    autofocus
                    :placeholder="isFolderAction ? 'Folder name' : 'File name'"
                    class="w-full"
                  />
                </div>
              </UFormField>
              <UFormField
                v-if="!isFolderAction"
                name="extension"
                :ui="{ error: 'hidden' }"
              >
                <!-- TODO: should use :error="false" when fixed -->
                <template #error>
                  <span />
                </template>
                <USelect
                  v-model="state.extension"
                  :items="contentFileExtensions"
                  variant="soft"
                  class="w-18"
                />
              </UFormField>
            </div>

            <span class="truncate leading-relaxed text-xs text-gray-400 dark:text-gray-500 block w-full">
              {{ routePath }}
            </span>
          </div>
        </template>
      </UPageCard>
    </template>
  </UForm>
</template>

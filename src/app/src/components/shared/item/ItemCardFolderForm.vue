<script setup lang="ts">
import { computed, reactive, ref, type PropType } from 'vue'
import * as z from 'zod'
import type {
  CreateFolderParams,
  RenameFileParams,
  StudioAction,
  TreeItem,
} from '../../../types'
import { StudioItemActionId } from '../../../types'
import { joinURL, withLeadingSlash, withoutLeadingSlash } from 'ufo'
import { useStudio } from '../../../composables/useStudio'
import { stripNumericPrefix } from '../../../utils/string'

const { context } = useStudio()

const isLoading = ref(false)

const props = defineProps({
  actionId: {
    type: String as PropType<StudioItemActionId.CreateFolder | StudioItemActionId.RenameItem>,
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
const originalName = computed(() => props.renamedItem?.name || '')

const schema = z.object({
  name: z.string()
    .min(1, 'Name cannot be empty')
    .refine((name: string) => !name.endsWith('.'), 'Name cannot end with "."')
    .refine((name: string) => !name.startsWith('/'), 'Name cannot start with "/"'),
})

type Schema = z.output<typeof schema>
const state = reactive<Schema>({
  name: originalName.value,
})

const routePath = computed(() => {
  return withLeadingSlash(joinURL(props.parentItem.routePath!, stripNumericPrefix(state.name)))
})

async function onSubmit() {
  if (isLoading.value) return

  isLoading.value = true

  let params: CreateFolderParams | RenameFileParams
  const newFsPath = joinURL(props.parentItem.fsPath, state.name)

  switch (props.actionId) {
    case StudioItemActionId.CreateFolder:
      params = {
        fsPath: withoutLeadingSlash(newFsPath),
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
    <UPageCard
      reverse
      class="hover:bg-white relative w-full min-w-0 overflow-hidden"
      :class="{ 'animate-pulse': isLoading }"
      :ui="{ container: 'overflow-hidden' }"
    >
      <template #body>
        <div class="flex flex-col gap-1">
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
                name="i-lucide-folder"
                class="h-4 w-4 shrink-0 text-muted"
              />
              <UInput
                v-model="state.name"
                variant="soft"
                autofocus
                placeholder="Folder name"
                class="w-full h-7"
                :loading="isLoading"
                @keydown.esc="context.unsetActionInProgress"
              />
            </div>
          </UFormField>

          <div class="flex items-center min-w-0">
            <div class="truncate leading-relaxed text-xs text-dimmed flex-1">
              {{ routePath }}
            </div>
          </div>
        </div>
      </template>
    </UPageCard>
  </UForm>
</template>

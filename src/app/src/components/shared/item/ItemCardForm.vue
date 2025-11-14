<script setup lang="ts">
import { computed, reactive, ref, type PropType, onMounted, onUnmounted, watch } from 'vue'
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
import { useI18n } from 'vue-i18n'

const { context } = useStudio()
const { t } = useI18n()

const isLoading = ref(false)
const formRef = ref<HTMLDivElement>()
const openTooltip = ref(false)

const props = defineProps({
  actionId: {
    type: String as PropType<StudioItemActionId.CreateDocument | StudioItemActionId.RenameItem | StudioItemActionId.CreateDocumentFolder | StudioItemActionId.CreateMediaFolder>,
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

const isDirectory = computed(() => props.renamedItem?.type === 'directory' || [StudioItemActionId.CreateDocumentFolder, StudioItemActionId.CreateMediaFolder].includes(props.actionId))
const action = computed<StudioAction<StudioItemActionId>>(() => context.itemActions.value.find(action => action.id === props.actionId)!)
const originalName = computed(() => props.renamedItem?.name === 'home' ? 'index' : props.renamedItem?.name || '')
const originalExtension = computed(() => {
  if (isDirectory.value) {
    return null
  }

  return props.renamedItem ? getFileExtension(props.renamedItem?.fsPath) : props.config.default
})
const originalPrefix = computed(() => props.renamedItem?.prefix || null)
const fullName = computed(() => {
  const baseName = state.name
  const prefixedName = state.prefix ? `${state.prefix}.${baseName}` : baseName
  return isDirectory.value ? prefixedName : `${prefixedName}.${state.extension}`
})

const schema = computed(() => z.object({
  name: z.string()
    .min(1, t('studio.validation.nameEmpty'))
    .refine((name: string) => !name.endsWith('.'), t('studio.validation.nameEndsWithDot'))
    .refine((name: string) => !name.startsWith('/'), t('studio.validation.nameStartsWithSlash')),
  extension: z.enum([...CONTENT_EXTENSIONS, ...MEDIA_EXTENSIONS] as [string, ...string[]]).nullish(),
  prefix: z.preprocess(
    val => val === '' ? null : val,
    z.string()
      .regex(/^\d+$/, 'Prefix must be a string containing only digits')
      .refine(
        (prefix: string | null | undefined) => {
          if (prefix === null || prefix === undefined) {
            return true
          }

          const num = Number(prefix)

          return Number.isInteger(num) && num >= 0
        },
        'Prefix must be a non-negative integer',
      )
      .nullish(),
  ),
}).refine(() => {
  const siblings = props.parentItem.children?.filter(child => !child.hide) || []

  const isDuplicate = siblings.some((sibling) => {
    const siblingBaseName = sibling.fsPath.split('/').pop()
    if (props.renamedItem && sibling.fsPath === props.renamedItem.fsPath) {
      return false
    }
    return siblingBaseName === fullName.value
  })

  return !isDuplicate
}, {
  message: t('studio.validation.nameExists'),
  path: ['name'],
}))

type SchemaType = {
  name: string
  extension: string | null | undefined
  prefix: string | null | undefined
}
const state = reactive<SchemaType>({
  name: originalName.value,
  extension: originalExtension.value,
  prefix: originalPrefix.value,
})

const validationErrors = computed(() => {
  try {
    schema.value.parse(state)
    return []
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues
    }
    return []
  }
})

watch(validationErrors, (errors) => {
  if (errors.length > 0) {
    openTooltip.value = true
  }
  else {
    openTooltip.value = false
  }
})

const routePath = computed(() => {
  const name = state.name === 'index' ? '/' : state.name
  const routePath = props.config.editable ? name : `${name}.${state.extension}`
  return withLeadingSlash(joinURL(props.parentItem.routePath!, parseName(routePath).name))
})

const displayInfo = computed(() => {
  if (isDirectory.value) {
    const itemCount = props.renamedItem?.children?.length || 0
    return t('studio.items.itemCount', itemCount)
  }
  return routePath.value
})

const tooltipText = computed(() => {
  if (validationErrors.value.length > 0) {
    return validationErrors.value[0]?.message
  }
  return t(`studio.actions.labels.${props.actionId}`)
})

const handleClickOutside = (event: MouseEvent) => {
  if (!formRef.value) {
    return
  }

  const target = event.target as HTMLElement
  const body = document.body
  const bodyPointerEvents = window.getComputedStyle(body).pointerEvents

  // Click on select extension dropdown
  if (bodyPointerEvents === 'none' || target.tagName === 'HTML') {
    const hasOpenDropdown = document.querySelector('[role="listbox"]')
      || document.querySelector('[data-radix-popper-content-wrapper]')
    if (hasOpenDropdown) {
      return
    }
  }

  const path = event.composedPath() as HTMLElement[]
  const clickInsideCard = path.includes(formRef.value)
  if (clickInsideCard) {
    return
  }

  context.unsetActionInProgress()
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
  const newFsPath = withoutLeadingSlash(joinURL(props.parentItem.fsPath, fullName.value))

  if (newFsPath === props.renamedItem?.fsPath) {
    isLoading.value = false
    context.unsetActionInProgress()
    return
  }

  switch (props.actionId) {
    case StudioItemActionId.CreateDocument:
      params = {
        fsPath: newFsPath,
        content: `# ${upperFirst(state.name)} file`,
      }
      break
    case StudioItemActionId.RenameItem:
      params = {
        newFsPath: newFsPath,
        item: props.renamedItem,
      }
      break
    case StudioItemActionId.CreateDocumentFolder:
      params = {
        fsPath: newFsPath,
      }
      break
    case StudioItemActionId.CreateMediaFolder:
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
    <template #default>
      <div
        ref="formRef"
        @click.stop
      >
        <UPageCard
          reverse
          :class="{ 'animate-pulse': isLoading }"
          class="hover:bg-elevated/20 relative w-full min-w-0 overflow-hidden"
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
                      v-model="state.prefix"
                      type="text"
                      pattern="[0-9]*"
                      variant="soft"
                      :placeholder="$t('studio.placeholders.order')"
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
                      :placeholder="$t('studio.placeholders.fileName')"
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
                      v-model="state.extension as string"
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

              <div class="shrink-0 flex gap-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-ph-x"
                  :aria-label="$t('studio.aria.cancel')"
                  size="xs"
                  square
                  :disabled="isLoading"
                  @click="context.unsetActionInProgress"
                />

                <UTooltip
                  v-model:open="openTooltip"
                  :text="tooltipText"
                  :popper="{ strategy: 'absolute' }"
                >
                  <UButton
                    type="submit"
                    variant="soft"
                    :color="validationErrors.length > 0 ? 'error' : 'secondary'"
                    :aria-label="$t('studio.aria.submit')"
                    :disabled="validationErrors.length > 0 || isLoading"
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

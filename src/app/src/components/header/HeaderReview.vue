<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import * as z from 'zod'
import { useStudio } from '../../composables/useStudio'
import { useRouter } from 'vue-router'
import { StudioBranchActionId } from '../../types'
import { useStudioState } from '../../composables/useStudioState'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { location } = useStudioState()
const { context } = useStudio()
const { t } = useI18n()

const isPublishing = ref(false)
const openTooltip = ref(false)

type Schema = z.output<typeof schema.value>

const schema = computed(() => z.object({
  commitMessage: z.string().nonempty(t('studio.validation.commitRequired')),
}))

const state = reactive<Schema>({
  commitMessage: '',
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

const tooltipText = computed(() => {
  if (validationErrors.value.length > 0) {
    return validationErrors.value[0].message
  }
  return t('studio.tooltips.publishChanges')
})

async function publishChanges() {
  if (isPublishing.value) return

  isPublishing.value = true
  try {
    const changeCount = context.draftCount.value
    await context.branchActionHandler[StudioBranchActionId.PublishBranch]({ commitMessage: state.commitMessage })

    state.commitMessage = ''
    router.push({ path: '/success', query: { changeCount: changeCount.toString() } })
  }
  catch (error) {
    const err = error as Error
    router.push({
      path: '/error',
      query: {
        error: err.message || t('studio.publish.failedGeneric'),
      },
    })
  }
  finally {
    isPublishing.value = false
  }
}

async function backToEditor() {
  router.push(`/${location.value.feature}`)
  await context.activeTree.value.selectItemByFsPath(location.value.fsPath)
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore defineShortcuts is auto-imported
defineShortcuts({
  escape: () => {
    state.commitMessage = ''
    router.push('/content')
  },
})
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="py-2 w-full"
    @submit="publishChanges"
  >
    <div class="w-full flex items-center gap-2">
      <UTooltip
        :text="$t('studio.tooltips.backToContent')"
        :kbds="['esc']"
      >
        <UButton
          icon="i-ph-arrow-left"
          color="neutral"
          variant="soft"
          size="sm"
          :aria-label="$t('studio.buttons.back')"
          @click="backToEditor"
        />
      </UTooltip>

      <UFormField
        name="commitMessage"
        class="w-full"
        :ui="{ error: 'hidden' }"
      >
        <template #error>
          <span />
        </template>

        <UInput
          v-model="state.commitMessage"
          :placeholder="$t('studio.placeholders.commitMessage')"
          size="sm"
          :disabled="isPublishing"
          class="w-full"
          autofocus
          :ui="{ base: 'focus-visible:ring-1' }"
          @input="openTooltip = false"
        />
      </UFormField>

      <UTooltip
        v-model:open="openTooltip"
        :text="tooltipText"
      >
        <UButton
          type="submit"
          color="neutral"
          variant="solid"
          :loading="isPublishing"
          :disabled="validationErrors.length > 0"
          icon="i-lucide-check"
          :label="$t('studio.buttons.publish')"
          :ui="{ leadingIcon: 'size-3.5' }"
        />
      </UTooltip>
    </div>
  </UForm>
</template>

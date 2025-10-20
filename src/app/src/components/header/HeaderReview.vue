<script setup lang="ts">
import { reactive, ref } from 'vue'
import * as z from 'zod'
import { useStudio } from '../../composables/useStudio'
import { useToast } from '@nuxt/ui/composables/useToast'
import { useRouter } from 'vue-router'
import { StudioBranchActionId } from '../../types'

const router = useRouter()
const { context } = useStudio()
const toast = useToast()

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore defineShortcuts is auto-imported
defineShortcuts({
  escape: () => {
    state.commitMessage = ''
    router.push('/content')
  },
})

const schema = z.object({
  commitMessage: z.string().nonempty('Commit message is required'),
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  commitMessage: '',
})

const isPublishing = ref(false)

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
    toast.add({
      title: 'Failed to publish changes',
      description: (error as Error).message,
      color: 'error',
    })
  }
  finally {
    isPublishing.value = false
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="py-2 w-full"
    @submit="publishChanges"
  >
    <template #default="{ errors }">
      <div class="w-full flex items-center gap-2">
        <UTooltip
          text="Back to content"
          :kbds="['esc']"
        >
          <UButton
            icon="i-ph-arrow-left"
            color="neutral"
            variant="soft"
            size="sm"
            aria-label="Back"
            to="/content"
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
            placeholder="Commit message"
            size="sm"
            :disabled="isPublishing"
            class="w-full"
            autofocus
            :ui="{ base: 'focus-visible:ring-1' }"
          />
        </UFormField>

        <UTooltip :text="(errors?.length > 0 && errors[0]?.message) || 'Publish changes'">
          <UButton
            type="submit"
            color="neutral"
            variant="solid"
            :loading="isPublishing"
            :disabled="errors.length > 0"
            icon="i-lucide-check"
            label="Publish"
            :ui="{ leadingIcon: 'size-3.5' }"
          />
        </UTooltip>
      </div>
    </template>
  </UForm>
</template>

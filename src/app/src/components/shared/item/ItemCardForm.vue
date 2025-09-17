<script setup lang="ts">
import { computed, reactive, type PropType } from 'vue'
import { Image } from '@unpic/vue'
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'
import { type TreeItem, ContentFileExtension } from '../../../types'
import { joinURL } from 'ufo'
import { contentFileExtensions } from '../../../utils/content'

const props = defineProps({
  parentItem: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
})

const schema = v.object({
  name: v.pipe(
    v.string(),
    v.nonEmpty('Name cannot be empty'),
    v.check((name: string) => !name.endsWith('.'), 'Name cannot end with "."'),
    v.check((name: string) => !name.startsWith('/'), 'Name cannot start with "/"'),
  ),
  extension: v.enum(ContentFileExtension),
})

type Schema = v.InferOutput<typeof schema>

const state = reactive({
  name: '',
  extension: 'md',
})

const itemExtensionIcon = computed<string>(() => {
  return {
    md: 'i-ph-markdown-logo',
    yaml: 'i-fluent-document-yml-20-regular',
    yml: 'i-fluent-document-yml-20-regular',
    json: 'i-lucide-file-json',
  }[state.extension as string] || 'i-mdi-file'
})

const path = computed(() => {
  return joinURL(props.parentItem.path, state.name)
})

function onSubmit(event: FormSubmitEvent<Schema>) {
  console.log('submit', event)
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <UPageCard
      reverse
      class="hover:bg-white relative w-full min-w-0"
    >
      <div class="relative">
        <Image
          src="https://placehold.co/1920x1080/f9fafc/f9fafc"
          width="426"
          height="240"
          alt="Card placeholder"
          class="z-[-1] rounded-t-lg"
        />
        <div class="absolute inset-0 flex items-center justify-center">
          <UIcon
            :name="itemExtensionIcon"
            class="w-8 h-8 text-gray-400 dark:text-gray-500"
          />
        </div>
      </div>

      <template #body>
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center justify-between gap-1">
            <UInput v-model="state.extension" />
            <USelect
              v-model="state.extension"
              :items="contentFileExtensions"
            />
          </div>
        </div>

        <span class="truncate leading-relaxed text-xs text-gray-400 dark:text-gray-500 block w-full">
          {{ path }}
        </span>
      </template>
    </UPageCard>
  </UForm>
</template>

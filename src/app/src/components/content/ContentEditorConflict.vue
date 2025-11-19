<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import type { ContentConflict, DraftItem } from '../../types'
import { useMonacoDiff } from '../../composables/useMonacoDiff'
import { useStudio } from '../../composables/useStudio'
import { ContentFileExtension, StudioFeature } from '../../types'

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
})

const { ui, gitProvider } = useStudio()

const diffEditorRef = ref<HTMLDivElement>()

const conflict = computed<ContentConflict>(() => props.draftItem.conflict!)
const repositoryInfo = computed(() => gitProvider.api.getRepositoryInfo())
const fileRemoteUrl = computed(() => gitProvider.api.getFileUrl(StudioFeature.Content, props.draftItem.fsPath))

const language = computed(() => {
  switch (props.draftItem.fsPath.split('.').pop()) {
    case ContentFileExtension.Markdown:
      return 'markdown'
    case ContentFileExtension.YAML:
    case ContentFileExtension.YML:
      return 'yaml'
    case ContentFileExtension.JSON:
      return 'json'
    default:
      return 'plaintext'
  }
})

useMonacoDiff(diffEditorRef, {
  original: conflict.value?.remoteContent || '',
  modified: conflict.value?.localContent || '',
  language: language.value,
  colorMode: ui.colorMode,
})
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="bg-warning/10 border-l-4 border-warning p-4 mb-4">
      <div class="flex items-start gap-3">
        <UIcon
          name="i-lucide-alert-triangle"
          class="size-4 text-warning shrink-0"
        />
        <div class="flex-1">
          <h3 class="font-semibold text-highlighted text-sm mb-3">
            {{ $t('studio.conflict.title') }}
          </h3>

          <dl class="space-y-2 text-xs mb-4">
            <div class="flex items-center">
              <dt class="text-muted min-w-20 flex items-center gap-1.5">
                <UIcon
                  :name="gitProvider.icon"
                  class="size-3.5"
                />
                {{ $t('studio.conflict.repository') }}
              </dt>
              <dd class="text-highlighted font-medium">
                <UButton
                  :label="`${repositoryInfo.owner}/${repositoryInfo.repo}`"
                  :to="gitProvider.api.getRepositoryUrl()"
                  variant="link"
                  target="_blank"
                  :padded="false"
                  size="xs"
                />
              </dd>
            </div>

            <div class="flex items-center">
              <dt class="text-muted min-w-20 flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-git-branch"
                  class="size-3.5"
                />
                {{ $t('studio.conflict.branch') }}
              </dt>
              <dd class="text-highlighted font-medium">
                <UButton
                  :label="repositoryInfo.branch"
                  :to="gitProvider.api.getBranchUrl()"
                  variant="link"
                  target="_blank"
                  :padded="false"
                  size="xs"
                />
              </dd>
            </div>

            <div class="flex items-center">
              <dt class="text-muted min-w-20 flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-file"
                  class="size-3.5"
                />
                {{ $t('studio.conflict.file') }}
              </dt>
              <dd class="text-highlighted font-medium">
                <UButton
                  :label="props.draftItem.fsPath"
                  :to="fileRemoteUrl"
                  variant="link"
                  target="_blank"
                  size="xs"
                />
              </dd>
            </div>
          </dl>

          <p class="text-muted text-xs mb-2">
            {{ $t('studio.conflict.description', { providerName: gitProvider.name }) }}
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 mb-2 px-2">
      <div class="flex items-center gap-1 text-sm text-muted">
        <UIcon
          :name="gitProvider.icon"
          class="size-3.5"
        />
        {{ gitProvider.name }}
      </div>
      <div class="flex items-center gap-1 text-sm text-muted">
        <UIcon
          name="i-lucide-globe"
          class="size-3.5"
        />
        {{ $t('studio.conflict.websiteVersion') }}
      </div>
    </div>

    <div
      ref="diffEditorRef"
      class="w-full h-full"
    />
  </div>
</template>

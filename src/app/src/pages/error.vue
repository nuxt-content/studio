<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStudio } from '../composables/useStudio'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { gitProvider } = useStudio()

const errorMessage = computed(() => {
  return (route.query.error as string) || t('studio.notifications.error.unknown')
})

const repositoryInfo = computed(() => gitProvider.api.getRepositoryInfo())

function retry() {
  router.push('/review')
}
</script>

<template>
  <div class="w-full h-full flex items-center justify-center bg-default">
    <div class="flex flex-col gap-8 max-w-md">
      <div class="flex justify-center">
        <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
          <UIcon
            name="i-lucide-alert-circle"
            class="w-8 h-8 text-error"
          />
        </div>
      </div>

      <div class="text-center">
        <h1 class="text-2xl font-bold text-default mb-2">
          {{ $t('studio.publish.failedTitle') }}
        </h1>
        <i18n-t
          keypath="studio.publish.summary"
          tag="p"
          class="text-dimmed flex items-center flex-wrap justify-center gap-x-1"
        >
          <template #branch>
            <UButton
              :label="repositoryInfo.branch"
              icon="i-lucide-git-branch"
              :to="gitProvider.api.getBranchUrl()"
              variant="link"
              target="_blank"
              :padded="false"
            />
          </template>
          <template #repo>
            <UButton
              :label="`${repositoryInfo.owner}/${repositoryInfo.repo}`"
              :icon="gitProvider.icon"
              :to="gitProvider.api.getRepositoryUrl()"
              variant="link"
              target="_blank"
              :padded="false"
            />
          </template>
        </i18n-t>
      </div>

      <UAlert
        icon="i-lucide-alert-triangle"
        :title="$t('studio.publish.errorTitle', gitProvider.name)"
        :description="errorMessage"
        color="error"
        variant="soft"
      />

      <div class="flex justify-center h-7">
        <UButton
          icon="i-lucide-rotate-ccw"
          @click="retry"
        >
          {{ $t('studio.buttons.retryPublish') }}
        </UButton>
      </div>
    </div>
  </div>
</template>

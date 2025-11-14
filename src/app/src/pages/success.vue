<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStudio } from '../composables/useStudio'
import { useStudioState } from '../composables/useStudioState'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { gitProvider } = useStudio()
const { manifestId } = useStudioState()
const { t } = useI18n()

const isReloadingApp = ref(false)
const isWaitingForDeployment = ref(true)
const previousManifestId = ref<string>(manifestId.value)

const changeCount = computed(() => {
  const queryCount = route.query.changeCount
  return queryCount ? Number.parseInt(queryCount as string, 10) : 0
})
const repositoryInfo = computed(() => gitProvider.api.getRepositoryInfo())

const alertDescription = computed(() => {
  if (isWaitingForDeployment.value) {
    return t('studio.publishSuccess.alertDescWaiting')
  }
  return t('studio.publishSuccess.alertDescComplete')
})

function reload() {
  isReloadingApp.value = true
  window.location.reload()
  setTimeout(() => {
    isReloadingApp.value = false
  }, 2000)
}

onMounted(() => {
  isWaitingForDeployment.value = true

  const newDeployment = watch(manifestId, (newId) => {
    if (newId !== previousManifestId.value) {
      previousManifestId.value = newId
      isWaitingForDeployment.value = false
      newDeployment.stop()
    }
  })
})
</script>

<template>
  <div class="w-full h-full flex items-center justify-center bg-default">
    <div class="flex flex-col gap-8 max-w-md">
      <div class="flex justify-center">
        <div class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
          <UIcon
            name="i-lucide-check-circle-2"
            class="w-8 h-8 text-success"
          />
        </div>
      </div>

      <div class="text-center">
        <h1 class="text-2xl font-bold text-default mb-2">
          {{ $t('studio.publishSuccess.title') }}
        </h1>
        <i18n-t
          keypath="studio.publishSuccess.summary"
          tag="p"
          class="text-dimmed flex items-center flex-wrap justify-center"
          :plural="changeCount"
        >
          <template #count>
            <span class="font-semibold text-default">{{ changeCount }}</span>
          </template>

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
        :icon="isWaitingForDeployment ? 'i-lucide-loader' : 'i-lucide-check'"
        :title="isWaitingForDeployment ? $t('studio.publishSuccess.alertTitleWaiting') : $t('studio.publishSuccess.alertTitleComplete')"
        :description="alertDescription"
        :color="isWaitingForDeployment ? 'warning' : 'success'"
        variant="soft"
        :ui="{ icon: isWaitingForDeployment ? 'animate-spin' : '' }"
      />

      <div class="flex justify-center h-7">
        <UButton
          v-if="!isWaitingForDeployment"
          icon="i-lucide-rotate-ccw"
          color="neutral"
          :loading="isReloadingApp"
          @click="reload"
        >
          {{ $t('studio.buttons.reloadApp') }}
        </UButton>
      </div>
    </div>
  </div>
</template>

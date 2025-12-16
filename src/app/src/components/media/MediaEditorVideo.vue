<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { PropType } from 'vue'
import { formatBytes, getFileExtension } from '../../utils/file'
import type { MediaItem, GitFile } from '../../types'
import { useStudio } from '../../composables/useStudio'
import { joinURL } from 'ufo'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  mediaItem: {
    type: Object as PropType<MediaItem>,
    required: true,
  },
  remoteFile: {
    type: Object as PropType<GitFile>,
    default: null,
  },
})

const { gitProvider } = useStudio()
const { t } = useI18n()

const videoRef = ref<HTMLVideoElement | null>(null)
const videoDimensions = ref({ width: 0, height: 0 })
const duration = ref(0)

onMounted(() => {
  if (videoRef.value) {
    videoRef.value.onloadedmetadata = () => {
      videoDimensions.value = {
        width: videoRef.value?.videoWidth || 0,
        height: videoRef.value?.videoHeight || 0,
      }
      duration.value = videoRef.value?.duration || 0
    }
  }
})

const fileExtension = computed(() => getFileExtension(props.mediaItem.path || '').toUpperCase())
const fileName = computed(() => {
  if (props.remoteFile?.name) {
    return props.remoteFile.name
  }
  if (props.mediaItem.stem) {
    const ext = props.mediaItem.extension ? `.${props.mediaItem.extension}` : ''
    return `${props.mediaItem.stem}${ext}`
  }
  return props.mediaItem.path || 'video'
})

const formattedDuration = computed(() => {
  if (!duration.value) {
    return '0s'
  }
  const totalSeconds = Math.round(duration.value)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) {
    return `${seconds}s`
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
})

const videoInfo = computed(() => {
  const info = [
    { label: t('studio.media.metaWidth'), value: `${videoDimensions.value.width}px` },
    { label: t('studio.media.metaHeight'), value: `${videoDimensions.value.height}px` },
    { label: t('studio.media.metaType'), value: fileExtension.value },
    { label: 'Duration', value: formattedDuration.value },
  ]

  if (props.remoteFile) {
    info.push({ label: t('studio.media.metaSize'), value: formatBytes(props.remoteFile.size) })
  }

  return info
})

const markdownCode = computed(() => {
  return `<video src="${props.mediaItem.path}" controls />`
})

const remotePath = computed(() => {
  if (!props.remoteFile?.path) {
    return ''
  }
  return joinURL(gitProvider.api.getBranchUrl(), props.remoteFile.path)
})
</script>

<template>
  <div class="flex flex-col h-full gap-4 p-4">
    <div class="flex items-center justify-center rounded-lg border border-default overflow-hidden max-h-[350px] bg-black">
      <video
        ref="videoRef"
        :src="mediaItem.path"
        class="max-w-full max-h-full"
        controls
      >
        {{ $t('studio.media.videoTagNotSupported') }}
      </video>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div
        v-for="info in videoInfo"
        :key="info.label"
        class="p-3 rounded-lg bg-default border border-muted"
      >
        <p class="text-xs text-muted mb-1">
          {{ info.label }}
        </p>
        <p class="text-sm font-semibold text-highlighted">
          {{ info.value }}
        </p>
      </div>
    </div>

    <div class="p-3 rounded-lg bg-default border border-muted">
      <div class="flex items-center gap-1 text-xs text-muted mb-2">
        <UIcon
          name="i-lucide-file"
          class="w-3.5 h-3.5"
        />
        <span>{{ $t('studio.media.fileName') }}</span>
      </div>
      <p class="text-xs font-mono text-highlighted truncate">
        {{ fileName }}
      </p>
    </div>

    <div class="p-3 rounded-lg bg-default border border-muted relative">
      <div class="absolute top-3 right-3">
        <CopyButton :content="mediaItem.path!" />
      </div>
      <div class="flex items-center gap-1 text-xs text-muted mb-2">
        <UIcon
          name="i-lucide-globe"
          class="w-3.5 h-3.5"
        />
        <span>{{ $t('studio.media.publicPath') }}</span>
      </div>
      <p class="text-xs font-mono text-highlighted truncate">
        {{ mediaItem.path }}
      </p>
    </div>

    <div
      v-if="remoteFile?.path"
      class="p-3 rounded-lg bg-default border border-muted relative"
    >
      <div class="absolute top-3 right-3">
        <CopyButton :content="remotePath" />
      </div>
      <div class="flex items-center gap-1 text-xs text-muted mb-2">
        <UIcon
          :name="gitProvider.icon"
          class="w-3.5 h-3.5"
        />
        <span>{{ $t('studio.media.providerPath', { providerName: gitProvider.name }) }}</span>
      </div>
      <p class="text-xs font-mono text-highlighted truncate">
        {{ remoteFile.path }}
      </p>
    </div>

    <div class="p-3 rounded-lg bg-default border border-muted relative">
      <div class="absolute top-3 right-3">
        <CopyButton :content="markdownCode" />
      </div>
      <div class="flex items-center gap-1 text-xs text-muted mb-2">
        <UIcon
          name="i-simple-icons:markdown"
          class="w-3.5 h-3.5"
        />
        <span>{{ $t('studio.media.markdown') }}</span>
      </div>
      <p class="text-xs font-mono text-highlighted truncate">
        {{ markdownCode }}
      </p>
    </div>
  </div>
</template>

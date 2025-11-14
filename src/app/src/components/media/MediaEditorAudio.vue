<template>
  <div class="relative w-full max-w-4xl mx-auto overflow-hidden bg-black aspect-video flex items-end justify-end">
    <div
      v-if="!isPlaying"
      class="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer z-10 transition-opacity hover:bg-black/60"
      @click="handlePlay"
    >
      <UButton
        icon="i-lucide-play"
        size="xl"
        color="neutral"
        variant="link"
        class="w-32 h-32 rounded-full flex items-center justify-center"
        :ui="{ leadingIcon: 'w-16 h-16', trailingIcon: 'w-16 h-16' }"
      >
        <template #default>
          <span class="sr-only">{{ $t('studio.media.playAudio') }}</span>
        </template>
      </UButton>
    </div>

    <audio
      v-if="loaded"
      ref="audioRef"
      class="w-full aspect-audio"
      :class="{ 'opacity-50': !isPlaying }"
      controls
      autoplay
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="isPlaying = false"
    >
      <source :src="src">
      {{ $t('studio.media.audioTagNotSupported') }}
    </audio>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  src: string
}>()

const audioRef = ref<HTMLAudioElement | null>(null)
const loaded = ref(false)
const isPlaying = ref(false)

const handlePlay = () => {
  if (!loaded.value) {
    loaded.value = true
    return
  }

  if (audioRef.value) {
    audioRef.value.play()
    isPlaying.value = true
  }
}
</script>

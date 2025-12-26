<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import HeaderMain from './header/HeaderMain.vue'
import HeaderReview from './header/HeaderReview.vue'
import HeaderSuccess from './header/HeaderSuccess.vue'
import { useStudioUI } from '../composables/useStudioUI'

const route = useRoute()

const currentHeader = computed(() => {
  if (route.name === 'review') {
    return HeaderReview
  }
  if (['success', 'error'].includes(route.name as string)) {
    return HeaderSuccess
  }
  return HeaderMain
})

const { ui } = useStudioUI('header')
</script>

<template>
  <div :class="ui.root">
    <component :is="currentHeader" />
  </div>
</template>

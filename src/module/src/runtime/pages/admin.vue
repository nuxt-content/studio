<script setup lang="ts">
import { computed } from 'vue'
import { useState, definePageMeta } from '#imports'
import type { ContentStudioUser } from 'nuxt-studio/app'

definePageMeta({
  layout: '',
})

const storageListenerKey = 'content-studio-auth-popup'
const user = useState<ContentStudioUser | null>('content-studio-user', () => null)
const loggedIn = computed(() => user.value !== null)
const clear = () => {
  user.value = null
}

const popupListener = (e: StorageEvent) => {
  if (e.key === `temp-${storageListenerKey}`) {
    $fetch<{ user: ContentStudioUser }>('/__nuxt_content/studio/auth/session')
      .then((session) => {
        user.value = session.user
      }).catch(() => {
        user.value = null
      })
    window.removeEventListener('storage', popupListener)
  }
}
const openInPopup = (route: string, size: { width?: number, height?: number } = {}) => {
  // Set a local storage item to tell the popup that we pending auth
  localStorage.setItem(`temp-${storageListenerKey}`, 'true')

  const width = size.width ?? 960
  const height = size.height ?? 600
  const top = (window.top?.outerHeight ?? 0) / 2
    + (window.top?.screenY ?? 0)
    - height / 2
  const left = (window.top?.outerWidth ?? 0) / 2
    + (window.top?.screenX ?? 0)
    - width / 2

  window.open(
    route,
    storageListenerKey,
    `width=${width}, height=${height}, top=${top}, left=${left}, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no`,
  )

  window.addEventListener('storage', popupListener)
}
</script>

<template>
  <div v-if="loggedIn">
    <h1>Welcome {{ user.name }}!</h1>
    <button @click="clear">
      Logout
    </button>
  </div>
  <div
    v-else
  >
    <h1>Not logged in</h1>
    <button
      @click="openInPopup('/__nuxt_content/studio/auth/github')"
    >
      Login with GitHub
    </button>
  </div>
</template>

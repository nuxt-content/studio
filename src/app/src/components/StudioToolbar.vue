<script setup lang="ts">
import { computed } from 'vue'
import UAvatar from '@nuxt/ui/components/Avatar.vue'
// import { useUserSession } from '#imports'

// const { user, clear: logOut } = useUserSession()
const { user, clear: logOut } = {
  clear: () => {},
  user: { name: 'John Doe', avatar: 'https://avatar.nuxt.com/1.png' },
}

const userMenuItems = computed(() => [
  {
    label: 'Sign out',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    onClick: () => {
      logOut()
    },
  },
])
</script>

<template>
  <div
    id="__studio_toolbar"
    class="transition-all duration-300 ease-in-out h-[var(--toolbar-height)]"
    part="toolbar"
  >
    <div class="flex gap-2 items-center">
      <UDropdownMenu
        :items="userMenuItems"
        :portal="false"
      >
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
        >
          <UAvatar
            :src="user?.avatar"
            size="xs"
          />
          <span>{{ user?.name }}</span>
        </UButton>
      </UDropdownMenu>
      <slot name="left" />
    </div>
    <div>
      <slot name="right" />
    </div>
  </div>
</template>

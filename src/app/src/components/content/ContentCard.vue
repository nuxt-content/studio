<script setup lang="ts">
import type { TreeItem } from '../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { getFileIcon } from '../../utils/file'
import { useStudio } from '../../composables/useStudio'
import { StudioItemActionId } from '../../types'
import ContentCardForm from './ContentCardForm.vue'

const { context } = useStudio()

const props = defineProps({
  item: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
  showRenameForm: {
    type: Boolean,
    default: false,
  },
})

const itemExtensionIcon = computed(() => getFileIcon(props.item.fsPath))
</script>

<template>
  <ContentCardForm
    v-if="showRenameForm"
    :renamed-item="props.item"
    :parent-item="context.activeTree.value.currentItem.value"
    :action-id="StudioItemActionId.RenameItem"
  />
  <ItemCard
    v-else
    :item="item"
  >
    <template #thumbnail>
      <div class="w-full h-full flex items-center justify-center">
        <UIcon
          :name="itemExtensionIcon"
          class="w-6 h-6 text-muted"
        />
      </div>
    </template>
    <template #name-prefix>
      <UIcon
        v-if="item.name === 'home'"
        name="i-lucide-house"
        class="size-3.5 shrink-0 text-muted"
      />
      <UBadge
        v-else-if="item.prefix"
        :label="item.prefix.toString()"
        size="xs"
        variant="soft"
        class="bg-elevated"
      />
    </template>
  </ItemCard>
</template>

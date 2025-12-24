<script setup lang="ts">
import type { FormItem } from '../../../types'
import type { PropType } from 'vue'
import { computed, ref } from 'vue'
import { CalendarDate, type DateValue } from '@internationalized/date'

defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    default: () => ({}),
  },
})

const model = defineModel<string>({ default: '' })
const inputDate = ref()

// Convert string to CalendarDate for the UInputDate component
const dateValue = computed<DateValue | undefined>({
  get() {
    if (!model.value) return undefined
    try {
      const date = new Date(model.value)
      if (Number.isNaN(date.getTime())) return undefined
      return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
    }
    catch {
      return undefined
    }
  },
  set(value: DateValue | undefined) {
    if (!value) {
      model.value = ''
      return
    }
    // Format as ISO date string (YYYY-MM-DD)
    model.value = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
  },
})
</script>

<template>
  <UInputDate
    ref="inputDate"
    v-model="dateValue"
    size="xs"
    class="w-full"
  >
    <template #trailing>
      <UPopover :reference="inputDate?.inputsRef?.[3]?.$el">
        <UButton
          color="neutral"
          variant="link"
          size="xs"
          icon="i-lucide-calendar"
          :aria-label="$t('studio.form.date.selectDate')"
          class="px-0"
        />

        <template #content>
          <UCalendar
            v-model="dateValue"
            class="p-2"
          />
        </template>
      </UPopover>
    </template>
  </UInputDate>
</template>

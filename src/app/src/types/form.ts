import type { JSType } from 'untyped'

export type FormInputsTypes = JSType | 'icon' | 'media' | 'file' | 'date'

export type FormTree = Record<string, FormItem>
export type FormItem = {
  id: string
  type: FormInputsTypes
  key?: string
  value?: unknown
  default?: unknown
  options?: string[]
  title: string
  icon?: string
  children?: FormTree
  disabled?: boolean
  hidden?: boolean
  // If type is combined with boolean
  toggleable?: boolean
  // Not in schema, created manually by user
  custom?: boolean
  // Items for array type
  arrayItemForm?: FormItem
}

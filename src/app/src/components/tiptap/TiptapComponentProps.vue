<script setup lang="ts">
import { ref, computed, unref, onMounted } from 'vue'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { PropType } from 'vue'
import { pascalCase, titleCase, kebabCase, flatCase } from 'scule'
import { buildFormTreeFromProps } from '../../utils/tiptap/props'
import { useStudio } from '../../composables/useStudio'
import { isEmpty } from '../../utils/object'
import type { FormItem, FormTree } from '../../types'

const props = defineProps({
  node: {
    type: Object as PropType<ProseMirrorNode>,
    required: true,
  },
  updateProps: {
    type: Function as PropType<(props: Record<string, unknown>) => void>,
    required: true,
  },
})

const { host } = useStudio()

// Nested form state for arrays/objects displayed as overlays
const formTree = ref<FormTree>({})
const nestedForm = ref<{ key: string, type: 'array' | 'object' } | null>(null)

const componentTag = computed(() => props.node?.attrs?.tag || props.node?.type?.name)
const componentName = computed(() => pascalCase(componentTag.value))
const componentMeta = computed(() => host.meta.getComponents().find(c => kebabCase(c.name) === kebabCase(componentTag.value)))

onMounted(() => {
  const tree = componentMeta.value ? buildFormTreeFromProps(unref(props.node), componentMeta.value) : {}
  formTree.value = normalizePropsTree(tree)
})

// Convert form tree to props object for saving
const propsObject = computed(() => {
  const result: Record<string, unknown> = {}

  for (const key of Object.keys(formTree.value)) {
    const prop = formTree.value[key]

    // Handle special case for rel attribute
    let value = prop.value
    if (prop.key === 'rel' && value === 'Default value applied') {
      value = 'nofollow,noopener,noreferrer'
    }

    // Only include non-empty values
    if (['boolean', 'number'].includes(typeof value) || !isEmpty(value as Record<string, unknown>)) {
      result[prop.key!] = typeof value === 'string' ? value : JSON.stringify(value)
    }

    // Remove if value equals default
    if (prop.default === value && prop.key) {
      Reflect.deleteProperty(result, prop.key)
    }
  }

  return result
})

// Update a prop value
function updateProp(key: string, value: unknown) {
  if (!formTree.value[key]) return

  formTree.value[key].value = value
  props.updateProps(propsObject.value)
}

// Get visible props
const visibleProps = computed(() =>
  Object.entries(formTree.value).filter(([_, prop]) => !prop.hidden),
)

// Open nested editor for arrays/objects
function openNestedForm(prop: FormItem, type: 'array' | 'object') {
  nestedForm.value = { key: prop.key!, type }
}

function closeNestedForm() {
  nestedForm.value = null
}

// Get input placeholder based on type
function getPlaceholder(prop: FormItem): string {
  switch (prop.type) {
    case 'string':
      return `Enter ${prop.title.toLowerCase()}...`
    case 'number':
      return '0'
    default:
      return ''
  }
}

function normalizePropsTree(tree: FormTree): FormTree {
  // Always add class prop by default
  if (!tree.class) {
    tree.class = {
      id: `#${flatCase(componentName.value)}/class`,
      key: 'class',
      title: 'Class',
      value: props.node?.attrs?.props?.class || '',
      type: 'string',
      default: '',
    }
  }

  // Always remove __tiptapWrap prop by default
  if (tree[':__tiptapWrap']) {
    Reflect.deleteProperty(tree, ':__tiptapWrap')
  }

  return tree
}
</script>

<template>
  <div
    class="p-4 min-w-[400px] max-w-[500px] not-prose overflow-y-auto max-h-[400px] relative"
    @click.stop
  >
    <!-- Header -->
    <div class="text-sm font-mono font-semibold text-highlighted mb-4">
      {{ titleCase(componentName).replace(/^U /, '') }} properties
    </div>

    <!-- Props list -->
    <div class="flex flex-col gap-3">
      <template
        v-for="[key, prop] in visibleProps"
        :key="key"
      >
        <div class="flex items-center gap-3">
          <!-- Label -->
          <div class="w-1/3">
            <span class="text-xs text-muted truncate block">
              {{ prop.title }}
            </span>
          </div>

          <!-- Input -->
          <div class="w-2/3 flex items-center gap-2">
            <!-- Nested form overlay for arrays/objects -->
            <template v-if="nestedForm?.key === prop.key">
              <div class="fixed inset-0 bg-default z-50 flex flex-col p-4 overflow-y-auto rounded-lg">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-sm font-mono font-semibold text-highlighted">
                    {{ prop.title }}
                  </span>
                  <UButton
                    size="xs"
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    aria-label="Close"
                    @click="closeNestedForm"
                  />
                </div>

                <FormInputArray
                  v-if="nestedForm?.type === 'array'"
                  class="flex-1"
                  :model-value="(prop.value as unknown[])"
                  :form-item="prop.arrayItemForm"
                  @update:model-value="updateProp(key, $event)"
                />

                <FormInputObject
                  v-else-if="nestedForm?.type === 'object'"
                  class="flex-1"
                  :model-value="(prop.value as Record<string, unknown>)"
                  :children="prop.children || {}"
                  @update:model-value="updateProp(key, $event)"
                />
              </div>
            </template>

            <!-- Array/Object button -->
            <template v-else-if="['array', 'object'].includes(prop.type)">
              <div class="flex items-center gap-2">
                <span
                  v-if="prop.type === 'array'"
                  class="text-xs text-muted"
                >
                  {{ (prop.value as unknown[])?.length || 0 }} items
                </span>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="link"
                  :label="`Edit ${prop.type}`"
                  @click="openNestedForm(prop, prop.type as 'array' | 'object')"
                />
              </div>
            </template>

            <!-- Boolean switch -->
            <template v-else-if="prop.type === 'boolean'">
              <USwitch
                :model-value="Boolean(prop.value)"
                :disabled="prop.disabled"
                @update:model-value="updateProp(key, $event)"
              />
            </template>

            <!-- Select for options -->
            <template v-else-if="prop.options?.length">
              <USelect
                :model-value="String(prop.value || '')"
                :items="prop.options"
                :disabled="prop.disabled"
                class="w-full"
                size="sm"
                @update:model-value="updateProp(key, $event)"
              />
            </template>

            <!-- Number input -->
            <template v-else-if="prop.type === 'number'">
              <UInput
                :model-value="Number(prop.value) || 0"
                type="number"
                :placeholder="getPlaceholder(prop)"
                :disabled="prop.disabled"
                class="w-full"
                size="sm"
                @update:model-value="updateProp(key, $event)"
              />
            </template>

            <!-- Text input (default) -->
            <template v-else>
              <UInput
                :model-value="String(prop.value || '')"
                :placeholder="getPlaceholder(prop)"
                :disabled="prop.disabled"
                class="w-full"
                size="sm"
                @update:model-value="updateProp(key, $event)"
              />
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ContentFileExtension, type DatabasePageItem, type DraftItem } from '../../types'
import type { PropType } from 'vue'
import { jsonToYaml, yamlToJson } from '../../utils/data'
import { useStudio } from '../../composables/useStudio'

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
  readOnly: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const document = defineModel<DatabasePageItem>()

const { host } = useStudio()

// const { t } = useI18n()

const skipFirstUpdate = ref(true)
const contentJSON = ref({})

const collection = computed(() => {
  return host.collection.getByFsPath(document.value!.fsPath!)
})

// Trigger on document changes
watch(() => document.value?.id + '-' + props.draftItem.version, async () => {
  if (document.value) {
    setJSON(document.value)
  }
}, { immediate: true })

// Trigger on action events
watch(() => props.draftItem.status, () => {
  setJSON(document.value!)
})

// Trigger on form changes
watch(contentJSON, (newJSON, oldJSON) => {
  if (skipFirstUpdate.value) {
    skipFirstUpdate.value = false
    return
  }

  if (props.readOnly) {
    return
  }

  if (JSON.stringify(newJSON) === JSON.stringify(oldJSON)) {
    return
  }

  let content = ''
  switch (document.value?.extension) {
    case ContentFileExtension.JSON:
      content = JSON.stringify(newJSON)
      break
    case ContentFileExtension.YAML:
    case ContentFileExtension.YML:
      content = jsonToYaml(newJSON)
      break
  }

  host.document.generate.documentFromContent(document.value!.id, content).then((doc) => {
    document.value = {
      ...host.document.utils.pickReservedKeys(props.draftItem.modified as DatabasePageItem || document.value!),
      ...doc,
    } as DatabasePageItem
  })
})

async function setJSON(document: DatabasePageItem) {
  const generateContentFromDocument = host.document.generate.contentFromDocument
  const generatedContent = await generateContentFromDocument(document) || ''

  switch (document.extension) {
    case ContentFileExtension.JSON:
      contentJSON.value = JSON.parse(generatedContent)
      break
    case ContentFileExtension.YAML:
    case ContentFileExtension.YML:
      contentJSON.value = yamlToJson(generatedContent)!
      break
  }
}
</script>

<template>
  <div class="pt-2 pb-4 px-4">
    <FormSchemaBased
      v-model="contentJSON"
      :collection-name="collection!.name"
      :schema="collection!.schema"
    />
  </div>
</template>

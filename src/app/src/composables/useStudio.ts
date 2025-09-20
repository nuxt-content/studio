import { createStorage } from 'unstorage'
import indexedDbDriver from 'unstorage/drivers/indexedb'
import { useGit } from './useGit'
import { useUi } from './useUi'
import { useContext } from './useContext'
import { useDraftFiles } from './useDraftFiles'
import { ref } from 'vue'
import { useTree } from './useTree'
import { createSharedComposable } from '@vueuse/core'
import type { RouteLocationNormalized } from 'vue-router'

const storage = createStorage({
  driver: indexedDbDriver({
    storeName: 'nuxt-content-preview',
  }),
})

export const useStudio = createSharedComposable(() => {
  const host = window.useStudioHost()
  const git = useGit({
    owner: 'owner',
    repo: 'repo',
    branch: 'main',
    token: '',
    authorName: 'Name',
    authorEmail: 'email@example.com',
  })

  const isReady = ref(false)
  const ui = useUi(host)
  const draftFiles = useDraftFiles(host, git, storage)
  const tree = useTree(host, draftFiles)
  const context = useContext(host, ui, draftFiles, tree)

  host.on.mounted(async () => {
    await draftFiles.load()
    host.app.requestRerender()
    isReady.value = true

    host.on.routeChange((to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
      tree.selectItemByRoute(to)
      // setTimeout(() => {
      //   detectActiveDocuments()
      // }, 100)
    })
  })

  // host.on.beforeUnload((event: BeforeUnloadEvent) => {
  //   // Ignore on development to prevent annoying dialogs
  //   if (import.meta.dev) return
  //   if (!draft.list.value.length) return

  //   // Recommended
  //   event.preventDefault()
  //   event = event || window.event

  //   // For IE and Firefox prior to version 4
  //   if (event) {
  //     event.returnValue = 'Sure?'
  //   }

  //   // For Safari
  //   return 'Sure?'
  // })

  return {
    isReady,
    host,
    git,
    ui,
    context,
    draftFiles,
    tree,
    // draftMedia: {
    //   get -> DraftMediaItem
    //   upsert
    //   remove
    //   revert
    //   move
    //   list -> DraftMediaItem[]
    //   revertAll
    // }
    // media: {
    //   list -> MediaItem[]
    // }
    // config {
    //   get -> ConfigItem
    //   update
    //   revert
    // }
  }
})

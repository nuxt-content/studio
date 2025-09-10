import { createStorage } from 'unstorage'
import indexedDbDriver from 'unstorage/drivers/indexedb'
import { useGit } from './useGit'
import { useUi } from './useUi'
import { useContext } from './useContext'
import { useDraft } from './useDraft'
import { ref } from 'vue'
import { useTree } from './useTree'

const storage = createStorage({
  driver: indexedDbDriver({
    storeName: 'nuxt-content-preview',
  }),
})

export const useStudio = () => {
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
  const context = useContext(host)
  const draft = useDraft(host, git, storage)
  const tree = useTree(host, draft)

  host.on.mounted(async () => {
    // TODO: Mounted is triggered 6 times
    await draft.load()
    host.requestRerender()
    isReady.value = true
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
    draft,
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
}

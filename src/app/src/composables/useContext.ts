import { createSharedComposable } from '@vueuse/core'
import { computed, ref } from 'vue'
import { StudioItemActionId, DraftStatus, StudioBranchActionId, StudioFeature,
} from '../types'
import type {
  PublishBranchParams,
  RenameFileParams,
  TreeItem,
  UploadMediaParams,
  CreateFileParams,
  StudioHost,
  StudioAction,
  ActionHandlerParams,
  StudioActionInProgress,
  CreateFolderParams,
  DatabaseItem,
  MediaItem,
} from '../types'
import { VirtualMediaCollectionName, generateStemFromFsPath } from '../utils/media'
import { oneStepActions, STUDIO_ITEM_ACTION_DEFINITIONS, twoStepActions, STUDIO_BRANCH_ACTION_DEFINITIONS } from '../utils/context'
import type { useTree } from './useTree'
import type { useGit } from './useGit'
import type { useDraftMedias } from './useDraftMedias'
import { useRoute, useRouter } from 'vue-router'
import { findDescendantsFileItemsFromFsPath } from '../utils/tree'
import { joinURL } from 'ufo'
import { upperFirst } from 'scule'

export const useContext = createSharedComposable((
  host: StudioHost,
  git: ReturnType<typeof useGit>,
  documentTree: ReturnType<typeof useTree>,
  mediaTree: ReturnType<typeof useTree>,
) => {
  const route = useRoute()
  const router = useRouter()

  /**
   * Current feature
   */
  const currentFeature = computed<StudioFeature | null>(() => {
    switch (route.name) {
      case 'media':
        return StudioFeature.Media
      case 'content':
        return StudioFeature.Content
      default:
        return null
    }
  })

  /**
   * Drafts
   */
  const allDrafts = computed(() => [...documentTree.draft.list.value, ...mediaTree.draft.list.value].filter(draft => draft.status !== DraftStatus.Pristine))
  const isDraftInProgress = computed(() => allDrafts.value.some(draft => draft.status !== DraftStatus.Pristine))
  const draftCount = computed(() => allDrafts.value.length)

  /**
   * Actions
   */
  const actionInProgress = ref<StudioActionInProgress | null>(null)
  const activeTree = computed(() => {
    if (route.name === 'media') {
      return mediaTree
    }
    return documentTree
  })

  const itemActions = computed<StudioAction<StudioItemActionId>[]>(() => {
    return STUDIO_ITEM_ACTION_DEFINITIONS.map(<K extends StudioItemActionId>(action: StudioAction<K>) => ({
      ...action,
      handler: async (args: ActionHandlerParams[K]) => {
        // Two steps actions need to be already in progress to be executed
        if (actionInProgress.value?.id === action.id) {
          if (twoStepActions.includes(action.id)) {
            await itemActionHandler[action.id](args)
            unsetActionInProgress()
            return
          }
          // One step actions can't be executed if already in progress
          else {
            return
          }
        }

        actionInProgress.value = { id: action.id }

        if (action.id === StudioItemActionId.RenameItem) {
          actionInProgress.value.item = args as TreeItem
        }

        // One step actions can be executed immediately
        if (oneStepActions.includes(action.id)) {
          await itemActionHandler[action.id](args)
          unsetActionInProgress()
        }
      },
    }))
  })

  const itemActionHandler: { [K in StudioItemActionId]: (args: ActionHandlerParams[K]) => Promise<void> } = {
    [StudioItemActionId.CreateDocumentFolder]: async (params: CreateFolderParams) => {
      const { fsPath } = params
      const folderName = fsPath.split('/').pop()!
      const rootDocumentFsPath = joinURL(fsPath, 'index.md')
      const navigationDocumentFsPath = joinURL(fsPath, '.navigation.yml')

      const navigationDocument = await host.document.db.create(navigationDocumentFsPath, `title: ${folderName}`)
      const rootDocument = await host.document.db.create(rootDocumentFsPath, `# ${upperFirst(folderName)} root file`)

      await activeTree.value.draft.create(navigationDocumentFsPath, navigationDocument)
      const rootDocumentDraftItem = await activeTree.value.draft.create(rootDocumentFsPath, rootDocument)

      unsetActionInProgress()

      await activeTree.value.selectItemByFsPath(rootDocumentDraftItem.fsPath)
    },
    [StudioItemActionId.CreateMediaFolder]: async (params: CreateFolderParams) => {
      const { fsPath } = params
      const gitkeepFsPath = joinURL(fsPath, '.gitkeep')
      const gitKeepId = joinURL(VirtualMediaCollectionName, gitkeepFsPath)
      const gitKeepMedia: MediaItem = {
        id: gitKeepId,
        fsPath: gitkeepFsPath,
        stem: generateStemFromFsPath(gitkeepFsPath),
        extension: '',
      }

      await host.media.upsert(gitkeepFsPath, gitKeepMedia)
      await (activeTree.value.draft as ReturnType<typeof useDraftMedias>).create(gitkeepFsPath, gitKeepMedia)

      unsetActionInProgress()

      await activeTree.value.selectParentByFsPath(gitkeepFsPath)
    },
    [StudioItemActionId.CreateDocument]: async (params: CreateFileParams) => {
      const { fsPath, content } = params
      const document = await host.document.db.create(fsPath, content)
      const draftItem = await activeTree.value.draft.create(fsPath, document as DatabaseItem)
      await activeTree.value.selectItemByFsPath(draftItem.fsPath)
    },
    [StudioItemActionId.UploadMedia]: async ({ parentFsPath, files }: UploadMediaParams) => {
      // Remove .gitkeep draft in folder if exists
      const gitkeepFsPath = parentFsPath === '/' ? '.gitkeep' : joinURL(parentFsPath, '.gitkeep')
      const gitkeepDraft = await activeTree.value.draft.get(gitkeepFsPath)
      if (gitkeepDraft) {
        await activeTree.value.draft.remove([gitkeepFsPath], { rerender: false })
      }

      for (const file of files) {
        await (activeTree.value.draft as ReturnType<typeof useDraftMedias>).upload(parentFsPath, file)
      }
    },
    [StudioItemActionId.RevertItem]: async (item: TreeItem) => {
      await activeTree.value.draft.revert(item.fsPath)
    },
    [StudioItemActionId.RenameItem]: async (params: TreeItem | RenameFileParams) => {
      const { item, newFsPath } = params as RenameFileParams

      // Revert file
      if (item.type === 'file') {
        await activeTree.value.draft.rename([{ fsPath: item.fsPath, newFsPath }])
        return
      }

      // Revert folder
      const descendants = findDescendantsFileItemsFromFsPath(activeTree.value.root.value, item.fsPath)
      if (descendants.length > 0) {
        const itemsToRename = descendants.map((descendant) => {
          return {
            fsPath: descendant.fsPath,
            newFsPath: descendant.fsPath.replace(item.fsPath, newFsPath),
          }
        })

        await activeTree.value.draft.rename(itemsToRename)
      }
    },
    [StudioItemActionId.DeleteItem]: async (item: TreeItem) => {
      // Delete file
      if (item.type === 'file') {
        await activeTree.value.draft.remove([item.fsPath])
        return
      }

      // Delete folder
      const descendants = findDescendantsFileItemsFromFsPath(activeTree.value.root.value, item.fsPath)
      if (descendants.length > 0) {
        const fsPaths: string[] = descendants.map(descendant => descendant.fsPath)
        await activeTree.value.draft.remove(fsPaths)
      }
    },
    [StudioItemActionId.DuplicateItem]: async (item: TreeItem) => {
      // Duplicate file
      if (item.type === 'file') {
        const draftItem = await activeTree.value.draft.duplicate(item.fsPath)
        await activeTree.value.selectItemByFsPath(draftItem!.fsPath)
        return
      }
    },
    [StudioItemActionId.RevertAllItems]: async () => {
      await documentTree.draft.revertAll()
      await mediaTree.draft.revertAll()
    },
  }

  const branchActions = computed<StudioAction<StudioBranchActionId>[]>(() => {
    return STUDIO_BRANCH_ACTION_DEFINITIONS.map(<K extends StudioBranchActionId>(action: StudioAction<K>) => ({
      ...action,
      handler: async (args: ActionHandlerParams[K]) => {
        actionInProgress.value = { id: action.id }
        await branchActionHandler[action.id](args)
        unsetActionInProgress()
      },
    }))
  })

  const branchActionHandler: { [K in StudioBranchActionId]: (args: ActionHandlerParams[K]) => Promise<void> } = {
    [StudioBranchActionId.PublishBranch]: async (params: PublishBranchParams) => {
      const { commitMessage } = params
      const documentFiles = await documentTree.draft.listAsRawFiles()
      const mediaFiles = await mediaTree.draft.listAsRawFiles()
      await git.commitFiles([...documentFiles, ...mediaFiles], commitMessage)

      // @ts-expect-error params is null
      await itemActionHandler[StudioItemActionId.RevertAllItems]()

      router.push('/content')
    },
  }

  function unsetActionInProgress() {
    actionInProgress.value = null
  }

  function switchFeature(feature: StudioFeature) {
    router.push(`/${feature}`)
  }

  return {
    currentFeature,
    activeTree,
    itemActions,
    itemActionHandler,
    branchActions,
    branchActionHandler,
    actionInProgress,
    allDrafts,
    draftCount,
    isDraftInProgress,
    unsetActionInProgress,
    switchFeature,
  }
})

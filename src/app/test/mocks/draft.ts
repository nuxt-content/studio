import type { DraftItem } from '../../src/types/draft'
import { DraftStatus } from '../../src/types/draft'

export const draftItemsList: DraftItem[] = [
  // Root files
  {
    id: 'landing/index.md',
    fsPath: '/index.md',
    status: DraftStatus.Updated,
    original: {
      id: 'landing/index.md',
      path: '/index.md',
      stem: 'index',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Original'],
      },
    },
    modified: {
      id: 'landing/index.md',
      path: '/index.md',
      stem: 'index',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Modified'],
      },
    },
  },
  {
    id: 'docs/root-file.md',
    fsPath: '/root-file.md',
    status: DraftStatus.Created,
    original: {
      id: 'docs/root-file.md',
      path: '/root-file.md',
      stem: 'root-file',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Original'],
      },
    },
    modified: {
      id: 'docs/root-file.md',
      path: '/root-file.md',
      stem: 'root-file',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Original'],
      },
    },
  },

  // Files in getting-started directory
  {
    id: 'docs/1.getting-started/2.introduction.md',
    fsPath: '/1.getting-started/2.introduction.md',
    status: DraftStatus.Updated,
    original: {
      id: 'docs/1.getting-started/2.introduction.md',
      path: '/1.getting-started/2.introduction.md',
      stem: '2.introduction',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Original'],
      },
    },
    modified: {
      id: 'docs/1.getting-started/2.introduction.md',
      path: '/1.getting-started/2.introduction.md',
      stem: '2.introduction',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Modified'],
      },
    },
  },
  {
    id: 'docs/1.getting-started/3.installation.md',
    fsPath: '/1.getting-started/3.installation.md',
    status: DraftStatus.Created,
    original: {
      id: 'docs/1.getting-started/3.installation.md',
      path: '/1.getting-started/3.installation.md',
      stem: '3.installation',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Original'],
      },
    },
    modified: {
      id: 'docs/1.getting-started/3.installation.md',
      path: '/1.getting-started/3.installation.md',
      stem: '3.installation',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Modified'],
      },
    },
  },
  {
    id: 'docs/1.getting-started/4.configuration.md',
    fsPath: '/1.getting-started/4.configuration.md',
    status: DraftStatus.Deleted,
    modified: undefined,
    original: {
      id: 'docs/1.getting-started/4.configuration.md',
      path: '/1.getting-started/4.configuration.md',
      stem: '4.configuration',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Original'],
      },
    },
  },

  // Files in advanced subdirectory
  {
    id: 'docs/1.getting-started/1.advanced/1.studio.md',
    fsPath: '/1.getting-started/1.advanced/1.studio.md',
    status: DraftStatus.Updated,
    original: {
      id: 'docs/1.getting-started/1.advanced/1.studio.md',
      path: '/1.getting-started/1.advanced/1.studio.md',
      stem: '1.studio',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Original'],
      },
    },
    modified: {
      id: 'docs/1.getting-started/1.advanced/1.studio.md',
      path: '/1.getting-started/1.advanced/1.studio.md',
      stem: '1.studio',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Modified'],
      },
    },
  },
  {
    id: 'docs/1.getting-started/1.advanced/2.deployment.md',
    fsPath: '/1.getting-started/1.advanced/2.deployment.md',
    status: DraftStatus.Created,
    original: {
      id: 'docs/1.getting-started/1.advanced/2.deployment.md',
      path: '/1.getting-started/1.advanced/2.deployment.md',
      stem: '2.deployment',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Original'],
      },
    },
    modified: {
      id: 'docs/1.getting-started/1.advanced/2.deployment.md',
      path: '/1.getting-started/1.advanced/2.deployment.md',
      stem: '2.deployment',
      extension: 'md',
      body: {
        type: 'minimark',
        value: ['Original'],
      },
    },
  },
]

import type { TreeItem } from '../../src/types/tree'

export const tree: TreeItem[] = [
  {
    id: 'landing/index.md',
    name: 'home',
    path: '/',
    type: 'file',
  },
  {
    id: 'docs/1.getting-started',
    name: 'getting-started',
    path: '/getting-started',
    type: 'directory',
    children: [
      {
        id: 'docs/1.getting-started/2.introduction.md',
        name: 'introduction',
        path: '/getting-started/introduction',
        type: 'file',
        fileType: 'page',
      },
      {
        id: 'docs/1.getting-started/3.installation.md',
        name: 'installation',
        path: '/getting-started/installation',
        type: 'file',
        fileType: 'page',
      },
      {
        id: 'docs/1.getting-started/1.advanced',
        name: 'advanced',
        path: '/getting-started/installation/advanced',
        type: 'directory',
        children: [
          {
            id: 'docs/1.getting-started/1.advanced/1.studio.md',
            name: 'studio',
            path: '/getting-started/installation/advanced/studio',
            type: 'file',
            fileType: 'page',
          },
        ],
      },
    ],
  },
]

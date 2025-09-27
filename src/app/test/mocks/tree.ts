import type { TreeItem } from '../../src/types/tree'

export const tree: TreeItem[] = [
  {
    id: 'landing/index.md',
    name: 'home',
    fsPath: 'index.md',
    type: 'file',
    routePath: '/',
  },
  {
    id: 'docs/1.getting-started',
    name: 'getting-started',
    fsPath: 'getting-started',
    type: 'directory',
    children: [
      {
        id: 'docs/1.getting-started/2.introduction.md',
        name: 'introduction',
        fsPath: '1.getting-started/2.introduction.md',
        type: 'file',
        routePath: '/getting-started/introduction',
      },
      {
        id: 'docs/1.getting-started/3.installation.md',
        name: 'installation',
        fsPath: '1.getting-started/3.installation.md',
        type: 'file',
        routePath: '/getting-started/installation',
      },
      {
        id: 'docs/1.getting-started/1.advanced',
        name: 'advanced',
        fsPath: '1.getting-started/1.advanced',
        type: 'directory',
        children: [
          {
            id: 'docs/1.getting-started/1.advanced/1.studio.md',
            name: 'studio',
            fsPath: '1.getting-started/1.advanced/1.studio.md',
            type: 'file',
            routePath: '/getting-started/installation/advanced/studio',
          },
        ],
      },
    ],
  },
]

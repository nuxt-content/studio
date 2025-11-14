import type { TreeItem } from '../../src/types/tree'

export const tree: TreeItem[] = [
  {
    name: 'home',
    fsPath: 'index.md',
    type: 'file',
    routePath: '/',
    prefix: null,
  },
  {
    name: 'getting-started',
    fsPath: '1.getting-started',
    type: 'directory',
    prefix: '1',
    children: [
      {
        name: 'introduction',
        fsPath: '1.getting-started/2.introduction.md',
        type: 'file',
        routePath: '/getting-started/introduction',
        prefix: '2',
      },
      {
        name: 'installation',
        fsPath: '1.getting-started/3.installation.md',
        type: 'file',
        routePath: '/getting-started/installation',
        prefix: '3',
      },
      {
        name: 'advanced',
        fsPath: '1.getting-started/1.advanced',
        type: 'directory',
        prefix: '1',
        children: [
          {
            name: 'studio',
            fsPath: '1.getting-started/1.advanced/1.studio.md',
            type: 'file',
            routePath: '/getting-started/installation/advanced/studio',
            prefix: '1',
          },
        ],
      },
    ],
  },
]

import type { FormTree } from '../../src/types'

export const farnabazFormTree: FormTree = {
  authors: {
    id: '#authors',
    title: 'Authors',
    type: 'object',
    children: {
      name: {
        id: '#authors/name',
        title: 'Name',
        type: 'string',
        value: 'Ahad Birang',
      },
      avatar: {
        id: '#authors/avatar',
        title: 'Avatar',
        type: 'object',
        children: {
          src: {
            id: '#authors/avatar/src',
            title: 'Src',
            type: 'string',
            value: 'https://avatars.githubusercontent.com/farnabaz',
          },
          alt: {
            id: '#authors/avatar/alt',
            title: 'Alt',
            type: 'string',
            value: '',
          },
        },
      },
      to: {
        id: '#authors/to',
        title: 'To',
        type: 'string',
        value: 'https://x.com/farnabaz',
      },
      username: {
        id: '#authors/username',
        title: 'Username',
        type: 'string',
        value: 'farnabaz',
      },
    },
  },
}

export const larbishFormTree: FormTree = {
  authors: {
    id: '#authors',
    title: 'Authors',
    type: 'object',
    children: {
      name: {
        id: '#authors/name',
        title: 'Name',
        type: 'string',
        value: 'Baptiste Leproux',
      },
      avatar: {
        id: '#authors/avatar',
        title: 'Avatar',
        type: 'object',
        children: {
          src: {
            id: '#authors/avatar/src',
            title: 'Src',
            type: 'string',
            value: 'https://avatars.githubusercontent.com/larbish',
          },
          alt: {
            id: '#authors/avatar/alt',
            title: 'Alt',
            type: 'string',
            value: '',
          },
        },
      },
      to: {
        id: '#authors/to',
        title: 'To',
        type: 'string',
        value: 'https://x.com/_larbish',
      },
      username: {
        id: '#authors/username',
        title: 'Username',
        type: 'string',
        value: 'larbish',
      },
    },
  },
}

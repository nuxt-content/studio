import { expect, test, describe } from 'vitest'
import { applyValueByPath } from '../../../src/utils/object'

describe('applyValueByPath', () => {
  test('Browse object until key is found based on path, then override value for this key', () => {
    const obj = {
      icon: {
        class: 'old value',
      },
    }

    expect(applyValueByPath(obj, 'icon/class', 'new value')).toStrictEqual({
      icon: {
        class: 'new value',
      },
    })
  })

  test('Browse object until key is found based on path, create field if not found', () => {
    const obj = {
      icon: {
        class: 'h-4 w-4',
      },
    }

    expect(applyValueByPath(obj, 'icon/size', 'new value')).toStrictEqual({
      icon: {
        class: 'h-4 w-4',
        size: 'new value',
      },
    })
  })

  test('Browse object until key is found based on path, update the object when it already exists', () => {
    const obj = {
      socials: {
        discord: 'https://discord.gg/test',
        twitter: 'https://twitter.com/test',
        x: 'https://x.com/test',
      },
    }

    expect(applyValueByPath(obj, 'socials', { x: undefined })).toStrictEqual({
      socials: {
        discord: 'https://discord.gg/test',
        twitter: 'https://twitter.com/test',
      },
    })
  })

  test('Browse object until key is found based on path, update array of strings when it already exists', () => {
    const obj = {
      items: ['one', 'two', 'three'],
    }

    expect(applyValueByPath(obj, 'items', ['one', 'two'])).toStrictEqual({
      items: ['one', 'two'],
    })
  })

  test('Browse object until key is found based on path, update array of objects when it already exists', () => {
    const obj = {
      items: [{ id: 1, name: 'one' }, { id: 2, name: 'two' }, { id: 3, name: 'three' }],
    }

    expect(applyValueByPath(obj, 'items', [{ id: 1, name: 'one' }, { id: 2, name: 'two' }])).toStrictEqual({
      items: [{ id: 1, name: 'one' }, { id: 2, name: 'two' }],
    })
  })

  test('Browse object until key is found based on path, set value directly when key does not exist', () => {
    const obj = {}

    expect(applyValueByPath(obj, 'socials', { x: 'https://x.com/test' })).toStrictEqual({
      socials: {
        x: 'https://x.com/test',
      },
    })
  })
})

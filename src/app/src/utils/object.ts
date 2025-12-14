const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}\.\d{3}Z)?$/

export function isDeepEqual(obj1: Record<string, unknown>, obj2: Record<string, unknown>) {
  if (typeof obj1 === 'string' && typeof obj2 === 'string') {
    if (String(obj1).match(dateRegex) && String(obj2).match(dateRegex)) {
      return new Date(obj1).getTime() === new Date(obj2).getTime()
    }
    return String(obj1).trim() === String(obj2).trim()
  }
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return String(obj1) === String(obj2)

  const keys1 = Object.keys(obj1).filter(k => obj1[k] != null)
  const keys2 = Object.keys(obj2).filter(k => obj2[k] != null)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!isDeepEqual(obj1[key] as Record<string, unknown>, obj2[key] as Record<string, unknown>)) return false
  }

  return true
}

export function isEmpty(obj: Array<unknown> | Array<Record<string, unknown>> | Record<string, unknown> | string | boolean | number | undefined): boolean {
  if (obj === undefined || obj === null || obj === '' || obj === false) return true

  if (Array.isArray(obj)) {
    return obj.length === 0 || obj.every(item => isEmpty(item as Record<string, unknown>))
  }

  return Object.keys(obj as Record<string, unknown>).length === 0 || Object.values(obj as Record<string, unknown>).every(value => value === null || value === undefined)
}

export function omit(obj: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(Object.entries(obj)
    .filter(([key]) => !keys.includes(key)))
}

export function replaceNullWithEmptyString(obj: Record<string, unknown>): Record<string, unknown> {
  for (const key in obj) {
    if (obj[key] === null) {
      obj[key] = ''
    }
    else if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj[key] = replaceNullWithEmptyString(obj[key] as Record<string, unknown>)
    }
  }
  return obj
}

// Browse object until key is found based on path, then override value for this key
export const applyValueByPath = (obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> => {
  const keys = path.split('/')

  let current = obj
  keys.forEach((key, index) => {
    const isLeaf = index === keys.length - 1
    if (isLeaf) {
      // Array
      if (Array.isArray(value) && Array.isArray(current[key])) {
        current[key] = value
      }
      // Object
      else if (typeof value === 'object' && typeof current[key] === 'object') {
        // Merge objects
        Object.assign(current[key] as Record<string, unknown>, value as Record<string, unknown>)
        // Remove undefined or null keys
        Object.keys(current[key] as Record<string, unknown>).forEach((k) => {
          if (
            (current[key] as Record<string, unknown>)[k] === undefined
            || (current[key] as Record<string, unknown>)[k] === null
          ) {
            Reflect.deleteProperty(current[key] as Record<string, unknown>, k)
          }
        })
      }
      else {
        // Set value directly
        current[key] = value
      }
    }
    else {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key] as Record<string, unknown>
    }
  })

  return obj
}

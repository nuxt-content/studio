export const omit = (obj: Record<string, unknown>, keys: string | string[]) => {
  return Object.fromEntries(Object.entries(obj)
    .filter(([key]) => !keys.includes(key)))
}

export const pick = (obj: Record<string, unknown>, keys: string | string[]) => {
  return Object.fromEntries(Object.entries(obj)
    .filter(([key]) => keys.includes(key)))
}

export function doObjectsMatch(base: Record<string, unknown>, target: Record<string, unknown>) {
  if (typeof base !== 'object' || typeof target !== 'object') {
    return base === target
  }
  if (Array.isArray(base) && Array.isArray(target)) {
    if (base.length !== target.length) {
      return false
    }
    for (let index = 0; index < base.length; index++) {
      const item = base[index]
      const targetItem = target[index]
      if (!doObjectsMatch(item, targetItem)) {
        return false
      }
    }
    return true
  }

  for (const key in base) {
    if (!doObjectsMatch(base[key] as Record<string, unknown>, target[key] as Record<string, unknown>)) {
      return false
    }
  }
  return true
}

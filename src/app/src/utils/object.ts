export const omit = (obj: Record<string, unknown>, keys: string | string[]) => {
  return Object.fromEntries(Object.entries(obj)
    .filter(([key]) => !keys.includes(key)))
}

export const pick = (obj: Record<string, unknown>, keys: string | string[]) => {
  return Object.fromEntries(Object.entries(obj)
    .filter(([key]) => keys.includes(key)))
}

export function isDeepEqual(obj1: Record<string, unknown>, obj2: Record<string, unknown>) {
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2

  const keys1 = Object.keys(obj1).filter(k => obj1[k] != null)
  const keys2 = Object.keys(obj2).filter(k => obj2[k] != null)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!isDeepEqual(obj1[key] as Record<string, unknown>, obj2[key] as Record<string, unknown>)) return false
  }

  return true
}

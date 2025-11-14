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

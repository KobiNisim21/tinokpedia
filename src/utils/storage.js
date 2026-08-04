export const STORAGE_VERSION = 'v2'

export function userStorageKey(userId, scope) {
  return ['tinokpedia', STORAGE_VERSION, userId || 'anonymous', scope].join(':')
}

export function readStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

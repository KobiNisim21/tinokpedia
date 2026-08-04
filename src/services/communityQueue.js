import { readStoredJson, userStorageKey, writeStoredJson } from '../utils/storage.js'

export class ApiRequestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function communityCacheKey(userId) {
  return userStorageKey(userId, 'community-posts')
}

function queueKey(userId) {
  return userStorageKey(userId, 'community-queue')
}

export function loadCachedPosts(userId) {
  return readStoredJson(communityCacheKey(userId), [])
}

export function saveCachedPosts(userId, posts) {
  writeStoredJson(communityCacheKey(userId), posts)
}

export function loadCommunityQueue(userId) {
  return readStoredJson(queueKey(userId), [])
}

export function enqueueCommunityOperation(userId, operation) {
  const queue = loadCommunityQueue(userId)
  const queued = {
    ...operation,
    queueId: operation.queueId || 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    createdAt: operation.createdAt || new Date().toISOString(),
  }
  writeStoredJson(queueKey(userId), [...queue, queued])
  return queued
}

export function discardPendingLocalPost(userId, localId) {
  const queue = loadCommunityQueue(userId).filter((operation) => {
    return operation.localId !== localId && operation.payload?.postId !== localId
  })
  writeStoredJson(queueKey(userId), queue)
}

export async function apiRequest(token, path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: 'Bearer ' + token,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiRequestError(response.status, body.error || 'Request failed')
  }
  return response.status === 204 ? null : response.json()
}

async function replayOperation(token, operation, idMap) {
  const payload = { ...(operation.payload || {}) }
  if (payload.postId && idMap[payload.postId]) payload.postId = idMap[payload.postId]

  if (operation.type === 'create') {
    return apiRequest(token, '/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }
  if (operation.type === 'edit') {
    return apiRequest(token, '/api/posts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }
  if (operation.type === 'delete') {
    return apiRequest(token, '/api/posts?id=' + encodeURIComponent(payload.postId), {
      method: 'DELETE',
    })
  }
  return apiRequest(token, '/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function flushCommunityQueue(userId, token) {
  const queue = loadCommunityQueue(userId)
  if (queue.length === 0) return { idMap: {}, droppedLocalIds: [], pending: 0 }

  const idMap = {}
  const droppedLocalIds = new Set()
  const remaining = []
  for (let index = 0; index < queue.length; index += 1) {
    const operation = queue[index]
    const targetId = operation.payload?.postId
    if (targetId && droppedLocalIds.has(targetId)) continue
    if (targetId?.startsWith('local_') && !idMap[targetId]) {
      remaining.push(operation)
      continue
    }

    try {
      const result = await replayOperation(token, operation, idMap)
      if (operation.type === 'create' && result?._id) {
        idMap[operation.localId] = result._id
      }
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status >= 500) {
        remaining.push(operation, ...queue.slice(index + 1))
        break
      }
      if (operation.type === 'create') droppedLocalIds.add(operation.localId)
    }
  }

  const remapped = remaining.map((operation) => {
    const postId = operation.payload?.postId
    if (!postId || !idMap[postId]) return operation
    return {
      ...operation,
      payload: { ...operation.payload, postId: idMap[postId] },
    }
  })
  writeStoredJson(queueKey(userId), remapped)
  return {
    idMap,
    droppedLocalIds: [...droppedLocalIds],
    pending: remapped.length,
  }
}

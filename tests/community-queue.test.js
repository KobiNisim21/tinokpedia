import test from 'node:test'
import assert from 'node:assert/strict'
import {
  enqueueCommunityOperation,
  flushCommunityQueue,
  loadCommunityQueue,
} from '../src/services/communityQueue.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

test('offline operations replay in order and remap local post IDs', async () => {
  global.localStorage = createStorage()
  const calls = []
  global.fetch = async (url, options) => {
    calls.push({ url, options })
    if (calls.length === 1) return jsonResponse(201, { _id: 'server_post' })
    return jsonResponse(200, { liked: true, likesCount: 1 })
  }

  enqueueCommunityOperation('user_1', {
    type: 'create',
    localId: 'local_1',
    payload: { content: 'Post', week: 20, trimester: 2, category: 'כללי' },
  })
  enqueueCommunityOperation('user_1', {
    type: 'like',
    payload: { action: 'like', postId: 'local_1' },
  })

  const result = await flushCommunityQueue('user_1', 'token')
  assert.equal(result.idMap.local_1, 'server_post')
  assert.equal(result.pending, 0)
  assert.equal(loadCommunityQueue('user_1').length, 0)
  assert.equal(JSON.parse(calls[1].options.body).postId, 'server_post')

  delete global.fetch
  delete global.localStorage
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ApiError,
  requireMongoId,
  requireText,
  serializePost,
} from '../api/lib/post-contract.js'

test('serializePost never exposes Clerk identifiers', () => {
  const result = serializePost({
    _id: '507f1f77bcf86cd799439011',
    clerkId: 'user_owner',
    authorName: 'Test',
    likes: ['user_owner', 'user_other'],
    comments: [{
      id: 'comment_1',
      clerkId: 'user_other',
      authorName: 'Other',
      text: 'Hello',
      createdAt: new Date('2026-01-01'),
    }],
    createdAt: new Date('2026-01-01'),
  }, 'user_owner')

  assert.equal(result.isOwner, true)
  assert.equal(result.likedByCurrentUser, true)
  assert.equal(result.likesCount, 2)
  assert.equal('clerkId' in result, false)
  assert.equal('likes' in result, false)
  assert.equal('clerkId' in result.comments[0], false)
})

test('validation rejects invalid IDs and oversized content', () => {
  assert.throws(() => requireMongoId('local_1'), ApiError)
  assert.throws(() => requireText('abcd', 'content', 3), ApiError)
})

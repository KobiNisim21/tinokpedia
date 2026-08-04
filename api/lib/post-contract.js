import mongoose from 'mongoose'

export const POST_CATEGORIES = [
  'בדיקות וייעוץ',
  'חוויות ושיח',
  'הטרימסטר שלי',
  'כללי',
]

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function requireMongoId(value, field = 'id') {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `${field} is invalid`)
  }
  return value
}

export function requireText(value, field, maxLength) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) throw new ApiError(400, `${field} is required`)
  if (normalized.length > maxLength) {
    throw new ApiError(400, `${field} is too long`)
  }
  return normalized
}

export function optionalCategory(value) {
  if (value === undefined) return undefined
  if (!POST_CATEGORIES.includes(value)) {
    throw new ApiError(400, 'category is invalid')
  }
  return value
}

export function serializeComment(comment) {
  const value = comment?.toObject ? comment.toObject() : comment
  return {
    id: value.id || String(value._id),
    authorName: value.authorName,
    isAnonymous: Boolean(value.isAnonymous),
    text: value.text,
    createdAt: value.createdAt,
  }
}

export function serializePost(post, currentClerkId) {
  const value = post?.toObject ? post.toObject() : post
  const likes = Array.isArray(value.likes) ? value.likes : []
  const comments = Array.isArray(value.comments)
    ? value.comments.map(serializeComment)
    : []

  return {
    _id: String(value._id),
    authorName: value.authorName,
    isAnonymous: Boolean(value.isAnonymous),
    week: value.week,
    trimester: value.trimester,
    category: value.category,
    content: value.content,
    likesCount: likes.length,
    likedByCurrentUser: likes.includes(currentClerkId),
    comments,
    commentsCount: comments.length,
    createdAt: value.createdAt,
    isOwner: value.clerkId === currentClerkId,
  }
}

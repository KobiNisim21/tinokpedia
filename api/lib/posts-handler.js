import dbConnect from './mongodb.js'
import { authenticate, getClerkUser, getDisplayName } from './auth.js'
import { ApiError, optionalCategory, requireMongoId, requireText, serializePost } from './post-contract.js'
import Post from '../models/Post.js'
import Notification from '../models/Notification.js'

async function createNotification({ recipientId, postId, actorName, type, message }) {
  await Notification.create({
    clerkId: recipientId,
    postId,
    actorName,
    type,
    message,
  })
}

function sendError(res, error) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message })
  }
  console.error('posts api failed', error)
  return res.status(500).json({ error: 'Server error' })
}

export default async function postsHandler(req, res) {
  let clerkId
  try {
    clerkId = await authenticate(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    await dbConnect()

    if (req.method === 'GET') {
      const { category, trimester } = req.query
      const filter = {}
      if (category && category !== 'הכל') filter.category = optionalCategory(category)
      if (trimester !== undefined) {
        const value = Number(trimester)
        if (![1, 2, 3].includes(value)) throw new ApiError(400, 'trimester is invalid')
        filter.trimester = value
      }

      const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(50).lean()
      return res.status(200).json(posts.map((post) => serializePost(post, clerkId)))
    }

    if (req.method === 'POST') {
      const { action } = req.body || {}

      if (action === 'like') {
        const postId = requireMongoId(req.body.postId, 'postId')
        const post = await Post.findById(postId)
        if (!post) throw new ApiError(404, 'Post not found')

        const index = post.likes.indexOf(clerkId)
        const liked = index === -1
        if (liked) post.likes.push(clerkId)
        else post.likes.splice(index, 1)
        await post.save()

        if (liked && post.clerkId !== clerkId) {
          try {
            const actorName = getDisplayName(await getClerkUser(clerkId))
            await createNotification({
              recipientId: post.clerkId,
              postId: post._id,
              actorName,
              type: 'like',
              message: actorName + ' אהבה את הפוסט שלך!',
            })
          } catch (error) {
            console.error('like notification failed', error)
          }
        }

        return res.status(200).json({ liked, likesCount: post.likes.length })
      }
      if (action === 'comment') {
        const postId = requireMongoId(req.body.postId, 'postId')
        const text = requireText(req.body.comment?.text, 'comment.text', 1000)
        const isAnonymous = Boolean(req.body.comment?.isAnonymous)
        const post = await Post.findById(postId)
        if (!post) throw new ApiError(404, 'Post not found')

        const actorName = isAnonymous
          ? 'חברה אנונימית'
          : getDisplayName(await getClerkUser(clerkId))
        post.comments.push({
          id: req.body.comment?.id || 'c_' + Date.now(),
          clerkId,
          authorName: actorName,
          isAnonymous,
          text,
          createdAt: new Date(),
        })
        post.commentsCount = post.comments.length
        await post.save()

        if (post.clerkId !== clerkId) {
          try {
            const preview = text.slice(0, 30) + (text.length > 30 ? '...' : '')
            await createNotification({
              recipientId: post.clerkId,
              postId: post._id,
              actorName,
              type: 'comment',
              message: actorName + ' הגיבה על הפוסט שלך: ' + preview,
            })
          } catch (error) {
            console.error('comment notification failed', error)
          }
        }
        return res.status(200).json(serializePost(post, clerkId))
      }

      const content = requireText(req.body.content, 'content', 3000)
      const category = optionalCategory(req.body.category) || 'חוויות ושיח'
      const week = Number(req.body.week)
      const trimester = Number(req.body.trimester)
      if (!Number.isInteger(week) || week < 0 || week > 40) {
        throw new ApiError(400, 'week is invalid')
      }
      if (![1, 2, 3].includes(trimester)) {
        throw new ApiError(400, 'trimester is invalid')
      }

      const isAnonymous = Boolean(req.body.isAnonymous)
      const authorName = isAnonymous
        ? 'חברה אנונימית'
        : getDisplayName(await getClerkUser(clerkId))
      const post = await Post.create({
        clerkId,
        authorName,
        isAnonymous,
        week,
        trimester,
        category,
        content,
      })
      return res.status(201).json(serializePost(post, clerkId))
    }
    if (req.method === 'PUT') {
      const postId = requireMongoId(req.body?.postId, 'postId')
      const content = requireText(req.body?.content, 'content', 3000)
      const category = optionalCategory(req.body?.category)
      const post = await Post.findById(postId)
      if (!post) throw new ApiError(404, 'Post not found')
      if (post.clerkId !== clerkId) throw new ApiError(403, 'Forbidden')

      post.content = content
      if (category) post.category = category
      await post.save()
      return res.status(200).json(serializePost(post, clerkId))
    }

    if (req.method === 'DELETE') {
      const postId = requireMongoId(req.query.id, 'id')
      const post = await Post.findById(postId)
      if (!post) throw new ApiError(404, 'Post not found')
      if (post.clerkId !== clerkId) throw new ApiError(403, 'Forbidden')

      await Promise.all([
        Post.findByIdAndDelete(postId),
        Notification.deleteMany({ postId: String(postId) }),
      ])
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
    return res.status(405).json({ error: 'Method ' + req.method + ' Not Allowed' })
  } catch (error) {
    return sendError(res, error)
  }
}

import { createClerkClient } from '@clerk/backend'
import dbConnect from './lib/mongodb.js'
import Post from './models/Post.js'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

async function verifyAuth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) throw new Error('No token')
  const { sub } = await clerk.verifyToken(token)
  return sub
}

export default async function handler(req, res) {
  await dbConnect()

  // GET /api/posts — list posts
  if (req.method === 'GET') {
    const { category, trimester } = req.query
    const filter = {}
    if (category && category !== 'הכל') filter.category = category
    if (trimester) filter.trimester = Number(trimester)
    const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(50).lean()
    return res.json(posts)
  }

  // POST /api/posts — create post OR toggle like
  if (req.method === 'POST') {
    let clerkId
    try {
      clerkId = await verifyAuth(req)
    } catch {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { action } = req.body

    // Toggle like
    if (action === 'like') {
      const { postId } = req.body
      if (!postId) return res.status(400).json({ error: 'postId required' })
      const post = await Post.findById(postId)
      if (!post) return res.status(404).json({ error: 'Post not found' })
      const idx = post.likes.indexOf(clerkId)
      if (idx === -1) {
        post.likes.push(clerkId)
      } else {
        post.likes.splice(idx, 1)
      }
      await post.save()
      return res.json({ likes: post.likes })
    }

    // Add comment
    if (action === 'comment') {
      const { postId, comment } = req.body
      if (!postId || !comment?.text) return res.status(400).json({ error: 'postId and comment.text required' })
      const post = await Post.findById(postId)
      if (!post) return res.status(404).json({ error: 'Post not found' })
      if (!post.comments) post.comments = []
      post.comments.push({
        id: comment.id || `c_${Date.now()}`,
        authorName: comment.authorName,
        isAnonymous: !!comment.isAnonymous,
        text: comment.text,
        createdAt: comment.createdAt || new Date().toISOString(),
      })
      post.commentsCount = post.comments.length
      await post.save()
      return res.json({ comments: post.comments, commentsCount: post.commentsCount })
    }

    // Create post
    const { authorName, isAnonymous, week, trimester, category, content } = req.body
    if (!content) return res.status(400).json({ error: 'content required' })
    const post = await Post.create({
      clerkId,
      authorName: isAnonymous ? 'חברה אנונימית' : (authorName || 'משתמשת'),
      isAnonymous: !!isAnonymous,
      week,
      trimester,
      category,
      content,
    })
    return res.status(201).json(post)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

import { createClerkClient, verifyToken } from '@clerk/backend'
import dbConnect from './lib/mongodb.js'
import Post from './models/Post.js'
import Notification from './models/Notification.js'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

async function verifyAuth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || token === 'null' || token === 'undefined') {
    console.error("verifyAuth: No valid token provided in headers:", req.headers.authorization)
    throw new Error('No token')
  }
  if (!process.env.CLERK_SECRET_KEY) {
    console.error("verifyAuth: CLERK_SECRET_KEY is missing from environment variables!")
  }
  try {
    const verified = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
    return verified.sub
  } catch (err) {
    console.error("verifyAuth: verifyToken failed:", err.message, err)
    throw err
  }
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
    } catch (err) {
      return res.status(401).json({ error: `Unauthorized: ${err.message}` })
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
        
        // Add notification for the post author if it's not their own post
        if (post.clerkId !== clerkId) {
          try {
            const user = await clerk.users.getUser(clerkId)
            const actorName = user ? (user.firstName || 'משתמשת') : 'משתמשת'
            await Notification.create({
              clerkId: post.clerkId,
              postId: post._id,
              actorName,
              type: 'like',
              message: `${actorName} אהבה את הפוסט שלך!`
            })
          } catch (e) {
            console.error("Failed to create notification for like", e)
          }
        }
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
      
      // Add notification for the post author if it's not their own post
      if (post.clerkId !== clerkId) {
        try {
          const actorName = comment.isAnonymous ? 'חברה אנונימית' : (comment.authorName || 'משתמשת')
          await Notification.create({
            clerkId: post.clerkId,
            postId: post._id,
            actorName,
            type: 'comment',
            message: `${actorName} הגיבה על הפוסט שלך: "${comment.text.substring(0, 30)}${comment.text.length > 30 ? '...' : ''}"`
          })
        } catch (e) {
          console.error("Failed to create notification for comment", e)
        }
      }
      
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

  // PUT /api/posts — edit post
  if (req.method === 'PUT') {
    let clerkId
    try {
      clerkId = await verifyAuth(req)
    } catch (err) {
      return res.status(401).json({ error: `Unauthorized: ${err.message}` })
    }

    const { postId, content, category } = req.body
    if (!postId || !content) return res.status(400).json({ error: 'postId and content required' })
    
    const post = await Post.findById(postId)
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (post.clerkId !== clerkId) return res.status(403).json({ error: 'Forbidden' })
    
    post.content = content
    if (category) post.category = category
    await post.save()
    
    return res.json(post)
  }

  // DELETE /api/posts — delete post
  if (req.method === 'DELETE') {
    let clerkId
    try {
      clerkId = await verifyAuth(req)
    } catch (err) {
      return res.status(401).json({ error: `Unauthorized: ${err.message}` })
    }

    const { id: postId } = req.query
    if (!postId) return res.status(400).json({ error: 'id required' })
    
    const post = await Post.findById(postId)
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (post.clerkId !== clerkId) return res.status(403).json({ error: 'Forbidden' })
    
    await Post.findByIdAndDelete(postId)
    // Optional: Also delete notifications for this post? We'll leave it as is or clean it up if needed.
    
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

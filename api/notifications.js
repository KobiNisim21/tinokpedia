import { createClerkClient, verifyToken } from '@clerk/backend'
import dbConnect from './lib/mongodb.js'
import Notification from './models/Notification.js'

async function verifyAuth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || token === 'null' || token === 'undefined') {
    throw new Error('No token')
  }
  const verified = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
  return verified.sub
}

export default async function handler(req, res) {
  await dbConnect()

  let clerkId
  try {
    clerkId = await verifyAuth(req)
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // GET /api/notifications — list user notifications
  if (req.method === 'GET') {
    const notifications = await Notification.find({ clerkId }).sort({ createdAt: -1 }).limit(30).lean()
    
    // Transform to frontend format
    const formatted = notifications.map(n => ({
      id: n._id,
      postId: n.postId,
      title: n.type === 'like' ? 'לייק חדש!' : 'תגובה חדשה!',
      message: n.message,
      read: n.read,
      createdAt: n.createdAt,
      type: n.type
    }))
    
    return res.json(formatted)
  }

  // POST /api/notifications — mark all as read
  if (req.method === 'POST') {
    const { action } = req.body
    if (action === 'mark_read') {
      await Notification.updateMany({ clerkId, read: false }, { read: true })
      return res.json({ success: true })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

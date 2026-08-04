import dbConnect from './mongodb.js'
import { authenticate } from './auth.js'
import Notification from '../models/Notification.js'

export default async function notificationsHandler(req, res) {
  let clerkId
  try {
    clerkId = await authenticate(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    await dbConnect()

    if (req.method === 'GET') {
      const notifications = await Notification.find({ clerkId })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean()
      return res.status(200).json(
        notifications.map((notification) => ({
          id: String(notification._id),
          postId: notification.postId,
          title: notification.type === 'like' ? 'לייק חדש!' : 'תגובה חדשה!',
          message: notification.message,
          read: notification.read,
          createdAt: notification.createdAt,
          type: notification.type,
        })),
      )
    }

    if (req.method === 'POST') {
      if (req.body?.action !== 'mark_read') {
        return res.status(400).json({ error: 'Invalid action' })
      }
      await Notification.updateMany({ clerkId, read: false }, { $set: { read: true } })
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method ' + req.method + ' Not Allowed' })
  } catch (error) {
    console.error('notifications api failed', error)
    return res.status(500).json({ error: 'Server error' })
  }
}

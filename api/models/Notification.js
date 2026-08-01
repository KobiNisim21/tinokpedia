import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  clerkId: { type: String, required: true }, // The user receiving the notification
  postId: { type: String, required: true },
  actorName: { type: String, required: true }, // The person who liked/commented
  type: { type: String, enum: ['like', 'comment'], required: true },
  read: { type: Boolean, default: false },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  clerkId: { type: String, required: true },
  authorName: { type: String },
  isAnonymous: { type: Boolean, default: false },
  week: { type: Number },
  trimester: { type: Number },
  category: { type: String, enum: ['בדיקות וייעוץ', 'חוויות ושיח', 'הטרימסטר שלי', 'כללי'] },
  content: { type: String, required: true },
  likes: { type: [String], default: [] },
  comments: { type: [{
    id: String,
    clerkId: String,
    authorName: String,
    isAnonymous: { type: Boolean, default: false },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }], default: [] },
  commentsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Post || mongoose.model('Post', PostSchema);

import dbConnect from '../lib/mongodb.js';
import User from '../models/User.js';
import { createClerkClient } from '@clerk/backend';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let clerkId;
  try {
    const verified = await clerk.verifyToken(token);
    clerkId = verified.sub;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (!clerkId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  if (req.method === 'GET') {
    try {
      const user = await User.findOne({ clerkId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json(user);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { googleId, email, name, edd, calculationMethod } = req.body;
      const user = await User.findOneAndUpdate(
        { clerkId },
        { 
          googleId, 
          email, 
          name, 
          edd, 
          calculationMethod,
          clerkId
        },
        { new: true, upsert: true }
      );
      return res.status(200).json(user);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

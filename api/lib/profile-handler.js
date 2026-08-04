import dbConnect from './mongodb.js'
import { authenticate, getClerkUser, getPrimaryEmail } from './auth.js'
import User from '../models/User.js'

function serializeProfile(user) {
  return {
    name: user.name,
    edd: user.edd,
    calculationMethod: user.calculationMethod,
    completedTests: user.completedTests || [],
  }
}

function buildUpdate(body, email) {
  const update = { email }

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 80) throw new Error('INVALID_NAME')
    update.name = name
  }

  if (body.edd !== undefined) {
    const edd = new Date(body.edd)
    if (Number.isNaN(edd.getTime())) throw new Error('INVALID_EDD')
    update.edd = edd
  }

  if (body.calculationMethod !== undefined) {
    if (!['LMP', 'EDD'].includes(body.calculationMethod)) {
      throw new Error('INVALID_METHOD')
    }
    update.calculationMethod = body.calculationMethod
  }

  if (body.completedTests !== undefined) {
    if (
      !Array.isArray(body.completedTests) ||
      body.completedTests.length > 100 ||
      body.completedTests.some((item) => typeof item !== 'string' || item.length > 80)
    ) {
      throw new Error('INVALID_TESTS')
    }
    update.completedTests = [...new Set(body.completedTests)]
  }

  return update
}

export default async function profileHandler(req, res) {
  let clerkId
  try {
    clerkId = await authenticate(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    await dbConnect()

    if (req.method === 'GET') {
      const user = await User.findOne({ clerkId })
      if (!user) return res.status(404).json({ error: 'User not found' })
      return res.status(200).json(serializeProfile(user))
    }

    if (req.method === 'POST') {
      const clerkUser = await getClerkUser(clerkId)
      const email = getPrimaryEmail(clerkUser)
      if (!email) return res.status(400).json({ error: 'User email is required' })

      let update
      try {
        update = buildUpdate(req.body || {}, email)
      } catch {
        return res.status(400).json({ error: 'Invalid profile data' })
      }

      const existing = await User.findOne({ clerkId })
      if (!existing && (!update.name || !update.edd)) {
        return res.status(400).json({ error: 'Name and EDD are required' })
      }

      const user = await User.findOneAndUpdate(
        { clerkId },
        { $set: update, $setOnInsert: { clerkId } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      )
      return res.status(200).json(serializeProfile(user))
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method ' + req.method + ' Not Allowed' })
  } catch (error) {
    console.error('profile api failed', error)
    return res.status(500).json({ error: 'Server error' })
  }
}

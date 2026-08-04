import { createClerkClient, verifyToken } from '@clerk/backend'

const secretKey = process.env.CLERK_SECRET_KEY
const clerk = secretKey ? createClerkClient({ secretKey }) : null

export async function authenticate(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')
  if (!match || !secretKey) throw new Error('Unauthorized')

  const verified = await verifyToken(match[1], { secretKey })
  if (!verified.sub) throw new Error('Unauthorized')
  return verified.sub
}

export async function getClerkUser(clerkId) {
  if (!clerk) throw new Error('Clerk is not configured')
  return clerk.users.getUser(clerkId)
}

export function getDisplayName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  return fullName || 'משתמשת'
}

export function getPrimaryEmail(user) {
  const primary = user?.emailAddresses?.find(
    (email) => email.id === user.primaryEmailAddressId,
  )
  return primary?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || null
}

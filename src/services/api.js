const API_BASE = '/api'

export function normalizeProfile(profile) {
  if (!profile) return null
  const edd = profile.edd ? new Date(profile.edd) : null
  return {
    name: profile.name || '',
    edd: edd && !Number.isNaN(edd.getTime()) ? edd : null,
    calculationMethod: profile.calculationMethod,
    completedTests: Array.isArray(profile.completedTests) ? profile.completedTests : [],
  }
}

export async function syncUserProfile(token, userData) {
  const res = await fetch(`${API_BASE}/users/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  })
  if (!res.ok) throw new Error('Failed to sync user profile')
  return normalizeProfile(await res.json())
}

export async function getUserProfile(token) {
  const res = await fetch(`${API_BASE}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return normalizeProfile(await res.json())
}

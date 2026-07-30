const API_BASE = '/api'

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
  return res.json()
}

export async function getUserProfile(token) {
  const res = await fetch(`${API_BASE}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

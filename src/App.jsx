import { useUser, useAuth } from "@clerk/clerk-react"
import { useState, useEffect } from "react"
import SignupScreen from "./components/SignupScreen"
import OnboardingForm from "./components/OnboardingForm"
import DashboardLayout from "./components/DashboardLayout"
import ProfileScreen from "./components/ProfileScreen"
import ToolsScreen from "./components/ToolsScreen"
import CommunityScreen from "./components/CommunityScreen"
import NotificationsModal from "./components/NotificationsModal"
import { syncUserProfile, getUserProfile } from "./services/api"

/**
 * Tinokpedia — app root.
 *
 * Auth-aware routing using Clerk:
 * 1. Not signed in → SignupScreen (tabbed register/login)
 * 2. Signed in but no EDD → OnboardingForm (for Google sign-in users)
 * 3. Signed in with EDD → DashboardLayout or ProfileScreen (via tab navigation)
 */
export default function App() {
  const { isSignedIn, user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [profile, setProfile] = useState(null) // { name, edd }
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("tracking") // "tracking" | "profile"
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [showOnlineToast, setShowOnlineToast] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  // Notifications — persisted in localStorage
  const NOTIF_KEY = "tinokpedia_notifications"
  function loadNotifications() {
    try {
      const raw = localStorage.getItem(NOTIF_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }
  const [notifications, setNotifications] = useState(loadNotifications)

  function addNotification(notif) {
    const updated = [{ ...notif, id: notif.id || `n_${Date.now()}`, read: false, createdAt: notif.createdAt || new Date().toISOString() }, ...notifications]
    setNotifications(updated)
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(updated)) } catch {}
  }

  function markAllRead() {
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(updated)) } catch {}
    
    // Also mark read on backend
    if (isSignedIn) {
      getToken().then(token => {
        if (token) {
          fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action: 'mark_read' })
          }).catch(console.error)
        }
      })
    }
  }

  // Fetch backend notifications
  useEffect(() => {
    if (!isSignedIn) return
    let mounted = true
    async function fetchNotifs() {
      try {
        const token = await getToken()
        if (!token) return
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const backendNotifs = await res.json()
          if (!mounted) return
          
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id))
            const newNotifs = backendNotifs.filter(n => !existingIds.has(n.id))
            if (newNotifs.length === 0) return prev
            
            const merged = [...newNotifs, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            try { localStorage.setItem(NOTIF_KEY, JSON.stringify(merged)) } catch {}
            return merged
          })
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err)
      }
    }
    fetchNotifs()
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifs, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isSignedIn, getToken])

  const unreadCount = notifications.filter(n => !n.read).length

  const notificationProps = {
    onNotificationsClick: () => setShowNotifications(true),
    unreadCount,
    onAddNotification: addNotification,
  }

  // Online / offline listener
  useEffect(() => {
    function handleOffline() {
      setIsOffline(true)
      setShowOnlineToast(false)
    }
    function handleOnline() {
      setIsOffline(false)
      setShowOnlineToast(true)
    }
    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  // Auto-dismiss the "back online" toast after 3 seconds
  useEffect(() => {
    if (!showOnlineToast) return
    const t = setTimeout(() => setShowOnlineToast(false), 3000)
    return () => clearTimeout(t)
  }, [showOnlineToast])

  // Load profile from Clerk metadata or MongoDB when user signs in
  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn || !user) {
      setProfile(null)
      setLoading(false)
      return
    }

    async function loadProfile() {
      try {
        // Check Clerk unsafeMetadata first
        const meta = user.unsafeMetadata
        if (meta?.edd && meta?.name) {
          setProfile({ name: meta.name, edd: new Date(meta.edd) })
          setLoading(false)
          return
        }

        // Fallback: check MongoDB
        const token = await getToken()
        if (token) {
          const dbProfile = await getUserProfile(token)
          if (dbProfile?.edd && dbProfile?.name) {
            setProfile({
              name: dbProfile.name,
              edd: new Date(dbProfile.edd),
            })
            setLoading(false)
            return
          }
        }
      } catch {
        // Profile not found — will show onboarding
      }
      setProfile(null)
      setLoading(false)
    }

    loadProfile()
  }, [isLoaded, isSignedIn, user, getToken])

  // Handle signup completion (from SignupScreen register tab)
  async function handleSignupComplete(data) {
    if (!data) {
      // Login complete — profile will be loaded by useEffect
      setLoading(true)
      // Force re-check
      const meta = user?.unsafeMetadata
      if (meta?.edd && meta?.name) {
        setProfile({ name: meta.name, edd: new Date(meta.edd) })
      }
      setLoading(false)
      return
    }

    const { name, edd, calculationMethod } = data
    try {
      // Save to Clerk metadata
      await user.update({
        unsafeMetadata: {
          name,
          edd: edd.toISOString(),
          calculationMethod,
        },
      })

      // Sync to MongoDB
      const token = await getToken()
      if (token) {
        await syncUserProfile(token, {
          name,
          edd: edd.toISOString(),
          calculationMethod,
          email: user.primaryEmailAddress?.emailAddress,
        })
      }
    } catch {
      // Continue even if sync fails — data is in Clerk metadata
    }

    setProfile({ name, edd })
  }

  // Handle onboarding completion (for Google sign-in users)
  async function handleOnboardingComplete(data) {
    await handleSignupComplete(data)
  }

  // Handle profile update from ProfileScreen edit form
  function handleProfileUpdate(updatedProfile) {
    setProfile(updatedProfile)
  }

  // Handle tab navigation
  function handleTabChange(tabId) {
    setActiveTab(tabId)
  }

  // ── Network status banners ──
  const networkOverlay = (
    <>
      {/* Offline banner — fixed top */}
      {isOffline && (
        <div className="fixed inset-x-0 top-0 z-[300] flex items-center justify-center gap-2 bg-amber-50 px-4 py-2.5 shadow-sm">
          <span className="material-symbols-outlined text-amber-600 text-[20px]">
            cloud_off
          </span>
          <span className="font-assistant text-body-sm text-amber-800">
            מצב אופליין — התוכן זמין לקריאה
          </span>
        </div>
      )}

      {/* Online toast — fixed top, auto-dismiss */}
      {showOnlineToast && (
        <div className="fixed inset-x-0 top-0 z-[300] flex items-center justify-center gap-2 bg-emerald-50 px-4 py-2.5 shadow-sm animate-in">
          <span className="material-symbols-outlined text-emerald-600 text-[20px]">
            wifi
          </span>
          <span className="font-assistant text-body-sm text-emerald-800">
            חזרת לחיבור לרשת!
          </span>
        </div>
      )}
    </>
  )

  // Loading state
  if (!isLoaded || (isSignedIn && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        {networkOverlay}
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="font-assistant text-body-base text-on-surface-variant">
            טוענת...
          </span>
        </div>
      </div>
    )
  }

  // Not signed in → show signup/login screen
  if (!isSignedIn) {
    return (
      <>
        {networkOverlay}
        <SignupScreen onComplete={handleSignupComplete} />
      </>
    )
  }

  // Signed in but no profile → show onboarding
  if (!profile) {
    return (
      <>
        {networkOverlay}
        <OnboardingForm onComplete={handleOnboardingComplete} />
      </>
    )
  }

  // Signed in with profile → show screen based on active tab
  let screen
  if (activeTab === "profile") {
    screen = (
      <ProfileScreen
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
        onTabChange={handleTabChange}
        notificationProps={notificationProps}
      />
    )
  } else if (activeTab === "tools") {
    screen = <ToolsScreen onTabChange={handleTabChange} notificationProps={notificationProps} />
  } else if (activeTab === "community") {
    screen = <CommunityScreen onTabChange={handleTabChange} edd={profile.edd} notificationProps={notificationProps} />
  } else {
    screen = (
      <DashboardLayout
        name={profile.name}
        edd={profile.edd}
        onTabChange={handleTabChange}
        notificationProps={notificationProps}
      />
    )
  }

  return (
    <>
      {networkOverlay}
      {screen}
      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAllRead={markAllRead}
      />
    </>
  )
}

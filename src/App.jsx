import { useUser, useAuth } from "@clerk/clerk-react"
import { useCallback, useState, useEffect } from "react"
import SignupScreen from "./components/SignupScreen"
import OnboardingForm from "./components/OnboardingForm"
import DashboardLayout from "./components/DashboardLayout"
import ProfileScreen from "./components/ProfileScreen"
import ToolsScreen from "./components/ToolsScreen"
import CommunityScreen from "./components/CommunityScreen"
import NotificationsModal from "./components/NotificationsModal"
import SideDrawer from "./components/SideDrawer"
import PregnancyTimelineModal from "./components/PregnancyTimelineModal"
import FoodSafetyModal from "./components/FoodSafetyModal"
import { syncUserProfile, getUserProfile } from "./services/api"
import { readStoredJson, userStorageKey, writeStoredJson } from "./utils/storage"

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
  
  // UI Modals state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const [isFoodSafetyOpen, setIsFoodSafetyOpen] = useState(false)

  const notificationKey = userStorageKey(user?.id, "notifications")
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    setNotifications(
      isSignedIn ? readStoredJson(notificationKey, []) : [],
    )
  }, [isSignedIn, notificationKey])

  function addNotification(notif) {
    setNotifications((previous) => {
      const updated = [{ ...notif, id: notif.id || `n_${Date.now()}`, read: false, createdAt: notif.createdAt || new Date().toISOString() }, ...previous]
      writeStoredJson(notificationKey, updated)
      return updated
    })
  }

  const markAllRead = useCallback(() => {
    setNotifications((previous) => {
      const updated = previous.map((notification) => ({ ...notification, read: true }))
      writeStoredJson(notificationKey, updated)
      return updated
    })
    
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
  }, [getToken, isSignedIn, notificationKey])

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
            writeStoredJson(notificationKey, merged)
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
  }, [isSignedIn, getToken, notificationKey])

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
      const meta = user.unsafeMetadata
      const metaEdd = meta?.edd ? new Date(meta.edd) : null
      const metaProfile =
        meta?.name && metaEdd && !Number.isNaN(metaEdd.getTime())
          ? {
              name: meta.name,
              edd: metaEdd,
              calculationMethod: meta.calculationMethod,
              completedTests: [],
            }
          : null

      try {
        const token = await getToken()
        if (token) {
          let dbProfile = await getUserProfile(token)
          if (!dbProfile && metaProfile) {
            dbProfile = await syncUserProfile(token, {
              name: metaProfile.name,
              edd: metaProfile.edd.toISOString(),
              calculationMethod: metaProfile.calculationMethod,
            })
          }
          if (dbProfile?.edd && dbProfile?.name) {
            setProfile(dbProfile)
            setLoading(false)
            return
          }
        }

        if (metaProfile) {
          setProfile(metaProfile)
          setLoading(false)
          return
        }
      } catch {
        if (metaProfile) {
          setProfile(metaProfile)
          setLoading(false)
          return
        }
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
      await user.update({
        unsafeMetadata: {
          name,
          edd: edd.toISOString(),
          calculationMethod,
        },
      })
    } catch (error) {
      console.error("Failed to save Clerk profile", error)
      return
    }

    const nextProfile = {
      name,
      edd,
      calculationMethod,
      completedTests: profile?.completedTests || [],
    }
    setProfile(nextProfile)

    try {
      const token = await getToken()
      if (token) {
        const savedProfile = await syncUserProfile(token, {
          name,
          edd: edd.toISOString(),
          calculationMethod,
          completedTests: nextProfile.completedTests,
        })
        setProfile(savedProfile)
      }
    } catch (error) {
      console.error("Failed to sync profile to MongoDB", error)
    }
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
  const handleMenuAction = (action) => {
    if (action === "timeline") setIsTimelineOpen(true)
    else if (action === "food") setIsFoodSafetyOpen(true)
    else if (action === "profile") setActiveTab("profile")
  }

  const enhancedNotificationProps = {
    ...notificationProps,
    onMenuClick: () => setIsDrawerOpen(true),
  }

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
        notificationProps={enhancedNotificationProps}
      />
    )
  } else if (activeTab === "tools") {
    screen = <ToolsScreen onTabChange={handleTabChange} notificationProps={enhancedNotificationProps} />
  } else if (activeTab === "community") {
    screen = <CommunityScreen onTabChange={handleTabChange} edd={profile.edd} notificationProps={enhancedNotificationProps} />
  } else {
    screen = (
      <DashboardLayout
        name={profile.name}
        edd={profile.edd}
        onTabChange={handleTabChange}
        notificationProps={enhancedNotificationProps}
        onOpenTimeline={() => setIsTimelineOpen(true)}
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
      
      <SideDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        user={user} 
        edd={profile.edd} 
        onNavigate={handleMenuAction} 
      />
      
      <PregnancyTimelineModal 
        isOpen={isTimelineOpen} 
        onClose={() => setIsTimelineOpen(false)} 
        edd={profile.edd} 
        profile={profile}
        setProfile={setProfile}
      />
      
      <FoodSafetyModal 
        isOpen={isFoodSafetyOpen} 
        onClose={() => setIsFoodSafetyOpen(false)} 
      />
    </>
  )
}

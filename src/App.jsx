import { useUser, useAuth } from "@clerk/clerk-react"
import { useState, useEffect } from "react"
import SignupScreen from "./components/SignupScreen"
import OnboardingForm from "./components/OnboardingForm"
import DashboardLayout from "./components/DashboardLayout"
import ProfileScreen from "./components/ProfileScreen"
import ToolsScreen from "./components/ToolsScreen"
import CommunityScreen from "./components/CommunityScreen"
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
      />
    )
  } else if (activeTab === "tools") {
    screen = <ToolsScreen onTabChange={handleTabChange} />
  } else if (activeTab === "community") {
    screen = <CommunityScreen onTabChange={handleTabChange} edd={profile.edd} />
  } else {
    screen = (
      <DashboardLayout
        name={profile.name}
        edd={profile.edd}
        onTabChange={handleTabChange}
      />
    )
  }

  return (
    <>
      {networkOverlay}
      {screen}
    </>
  )
}

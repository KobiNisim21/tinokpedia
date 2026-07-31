import { useUser, useAuth } from "@clerk/clerk-react"
import { useState, useEffect } from "react"
import SignupScreen from "./components/SignupScreen"
import OnboardingForm from "./components/OnboardingForm"
import DashboardLayout from "./components/DashboardLayout"
import ProfileScreen from "./components/ProfileScreen"
import ToolsScreen from "./components/ToolsScreen"
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

  // Loading state
  if (!isLoaded || (isSignedIn && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
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
    return <SignupScreen onComplete={handleSignupComplete} />
  }

  // Signed in but no profile → show onboarding
  if (!profile) {
    return <OnboardingForm onComplete={handleOnboardingComplete} />
  }

  // Signed in with profile → show screen based on active tab
  if (activeTab === "profile") {
    return (
      <ProfileScreen
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
        onTabChange={handleTabChange}
      />
    )
  }

  if (activeTab === "tools") {
    return <ToolsScreen onTabChange={handleTabChange} />
  }

  return (
    <DashboardLayout
      name={profile.name}
      edd={profile.edd}
      onTabChange={handleTabChange}
    />
  )
}

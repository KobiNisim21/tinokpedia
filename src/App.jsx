import { useState } from "react"
import SignupScreen from "./components/SignupScreen"
import DashboardLayout from "./components/DashboardLayout"

/**
 * Tinokpedia — app root.
 *
 * Holds the onboarding state machine: until the user completes signup we show
 * the SignupScreen; once they submit their name + due date we store the
 * profile and render the DashboardLayout, passing the EDD down so it can
 * calculate the current pregnancy week.
 *
 * (A conditional render is used rather than a routing library — the dashboard
 * is the only post-onboarding view for now. Swap in a router later if needed.)
 */
export default function App() {
  const [profile, setProfile] = useState(null) // { name, edd } | null

  if (!profile) {
    return <SignupScreen onComplete={setProfile} />
  }

  return <DashboardLayout name={profile.name} edd={profile.edd} />
}

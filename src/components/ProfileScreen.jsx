import { useState, useRef } from "react"
import { useUser, useAuth, useClerk } from "@clerk/clerk-react"
import Header from "./Header"
import BottomNav from "./BottomNav"
import HebrewDatePicker from "./HebrewDatePicker"
import { pregnancyStatus, eddFromInputs, parseDdMmYyyy, isoToDdMmYyyy } from "../utils/pregnancy"
import { syncUserProfile } from "../services/api"

/** Format raw digits into a dd/mm/yyyy mask as the user types. */
function maskDate(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
  return parts.filter(Boolean).join("/")
}

/** Segmented-control option for the calculation-method toggle. */
function MethodOption({ label, htmlFor, selected, onSelect }) {
  return (
    <>
      <input
        type="radio"
        id={htmlFor}
        name="editCalcMethod"
        checked={selected}
        onChange={onSelect}
        className="sr-only peer"
      />
      <label
        htmlFor={htmlFor}
        className={`flex-1 text-center py-2 rounded-lg cursor-pointer font-assistant text-body-base transition-colors duration-200 ${
          selected
            ? "bg-surface-variant font-semibold text-on-surface"
            : "text-on-surface-variant"
        }`}
      >
        {label}
      </label>
    </>
  )
}

/** Format a Date object as dd/mm/yyyy */
function formatDate(date) {
  if (!date) return "—"
  const d = new Date(date)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}/${mm}/${d.getFullYear()}`
}

/**
 * ProfileScreen — מסך פרופיל
 *
 * Displays user info, pregnancy details, edit capability, and sign-out.
 * Matches the app's design language (RTL, Heebo/Assistant, primary-container accents).
 */
export default function ProfileScreen({ profile, onProfileUpdate, onTabChange }) {
  const { user } = useUser()
  const { getToken } = useAuth()
  const { signOut } = useClerk()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState("")
  const [editMethod, setEditMethod] = useState("last_period")
  const [editDateText, setEditDateText] = useState("")
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const status = profile?.edd ? pregnancyStatus(profile.edd) : null
  const trimesterNames = { 1: "ראשון", 2: "שני", 3: "שלישי" }

  const currentCalcMethod = user?.unsafeMetadata?.calculationMethod || "LMP"
  const methodLabel = currentCalcMethod === "EDD" ? "לפי תאריך לידה משוער" : "לפי וסת אחרון"

  // Avatar: Clerk image or initial-based fallback
  const avatarUrl = user?.imageUrl
  const initials = (profile?.name || user?.firstName || "?").charAt(0)

  function openEditForm() {
    setEditName(profile?.name || "")
    setEditMethod(currentCalcMethod === "EDD" ? "due_date" : "last_period")
    setEditDateText("")
    setEditing(true)
  }

  function closeEditForm() {
    setEditing(false)
  }

  function handleDateTextChange(event) {
    setEditDateText(maskDate(event.target.value))
  }

  function handleCalendarSelect(date) {
    setEditDateText(isoToDdMmYyyy(date.toISOString()))
  }

  async function handleSave(event) {
    event.preventDefault()
    const parsed = parseDdMmYyyy(editDateText)
    if (!editName.trim() || !parsed) return

    const edd = eddFromInputs(editMethod, parsed)
    const calculationMethod = editMethod === "last_period" ? "LMP" : "EDD"

    try {
      setSaving(true)

      // Update Clerk metadata
      await user.update({
        unsafeMetadata: {
          name: editName.trim(),
          edd: edd.toISOString(),
          calculationMethod,
        },
      })

      // Sync to MongoDB
      const token = await getToken()
      if (token) {
        await syncUserProfile(token, {
          name: editName.trim(),
          edd: edd.toISOString(),
          calculationMethod,
          email: user.primaryEmailAddress?.emailAddress,
        })
      }

      // Update parent state so Dashboard reflects changes immediately
      onProfileUpdate({ name: editName.trim(), edd })
      setEditing(false)
    } catch (err) {
      console.error("Failed to update profile:", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
  }

  const editDateLabel =
    editMethod === "due_date" ? "תאריך לידה משוער" : "תאריך וסת אחרון"

  const parsedEditDate = parseDdMmYyyy(editDateText)
  const canSave = editName.trim().length > 0 && parsedEditDate !== null

  return (
    <div className="flex min-h-screen flex-col md:items-center">
      <Header />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-stack-gap px-margin-mobile py-6 pb-24 md:pb-6">

        {/* ── User Information Card ── */}
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-card-padding text-center soft-shadow">
          {/* Avatar */}
          <div className="h-20 w-20 overflow-hidden rounded-full bg-primary-container shadow-sm">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="תמונת פרופיל"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-heebo text-3xl font-bold text-on-primary-container">
                {initials}
              </div>
            )}
          </div>

          {/* Name & Email */}
          <div className="flex flex-col gap-1">
            <h2 className="font-heebo text-headline-xl text-slate-800">
              {profile?.name || user?.fullName || user?.firstName || "משתמשת"}
            </h2>
            <p className="font-assistant text-body-sm text-on-surface-variant">
              {user?.primaryEmailAddress?.emailAddress || ""}
            </p>
          </div>

          {/* Week & Trimester badges */}
          {status && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-container px-3 py-1 font-heebo text-label-caps text-on-primary-container">
                שבוע {status.week}
              </span>
              <span className="rounded-full bg-secondary-container px-3 py-1 font-heebo text-label-caps text-on-secondary-container">
                שליש {trimesterNames[status.trimester]}
              </span>
            </div>
          )}
        </div>

        {/* ── Pregnancy Details Card ── */}
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-card-padding soft-shadow">
          <h3 className="font-heebo text-headline-xl text-slate-800">
            פרטי ההריון
          </h3>

          <div className="flex flex-col gap-3">
            {/* EDD */}
            <div className="flex items-center justify-between">
              <span className="font-assistant text-body-base text-on-surface-variant">
                תאריך לידה משוער
              </span>
              <span className="font-heebo text-body-base font-medium text-slate-800" dir="ltr">
                {formatDate(profile?.edd)}
              </span>
            </div>

            {/* Calculation method */}
            <div className="flex items-center justify-between">
              <span className="font-assistant text-body-base text-on-surface-variant">
                שיטת חישוב
              </span>
              <span className="font-heebo text-body-base font-medium text-slate-800">
                {methodLabel}
              </span>
            </div>

            {/* Days remaining */}
            {status && (
              <div className="flex items-center justify-between">
                <span className="font-assistant text-body-base text-on-surface-variant">
                  ימים למפגש
                </span>
                <span className="font-heebo text-body-base font-medium text-primary">
                  {status.daysToDue} ימים
                </span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-surface-variant" />

          {/* Edit button */}
          <button
            type="button"
            onClick={openEditForm}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-low py-3 font-heebo text-body-base text-primary transition-colors hover:bg-surface-variant active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
            עריכת פרטי הריון
          </button>
        </div>

        {/* ── Edit Modal (inline overlay) ── */}
        {editing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-[500px] rounded-3xl bg-white p-card-padding shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-heebo text-headline-xl text-slate-800">
                  עריכת פרטים
                </h3>
                <button
                  type="button"
                  onClick={closeEditForm}
                  className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form className="flex flex-col gap-6" onSubmit={handleSave} noValidate>
                {/* Name */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="editName"
                    className="font-heebo text-headline-xl text-primary"
                  >
                    מה השם שלך?
                  </label>
                  <input
                    id="editName"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="הכניסי את שמך"
                    className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 font-assistant text-body-base text-on-background outline-none transition-shadow placeholder:text-outline focus:ring-2 focus:ring-primary-container"
                  />
                </div>

                {/* Calculation method toggle */}
                <div className="flex flex-col gap-3">
                  <span className="font-heebo text-headline-xl text-primary">
                    איך תרצי לחשב את גיל ההריון?
                  </span>
                  <div className="flex rounded-xl bg-surface-container-low p-1">
                    <MethodOption
                      label="לפי וסת אחרון"
                      htmlFor="editCalcLastPeriod"
                      selected={editMethod === "last_period"}
                      onSelect={() => setEditMethod("last_period")}
                    />
                    <MethodOption
                      label="לפי תאריך לידה משוער"
                      htmlFor="editCalcDueDate"
                      selected={editMethod === "due_date"}
                      onSelect={() => setEditMethod("due_date")}
                    />
                  </div>
                </div>

                {/* Date picker */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="editCalcDate"
                    className="font-assistant text-body-sm text-on-surface-variant"
                  >
                    {editDateLabel}
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(true)}
                      aria-label="פתחי לוח שנה"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-primary"
                    >
                      <span className="material-symbols-outlined">calendar_month</span>
                    </button>

                    <input
                      id="editCalcDate"
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={editDateText}
                      onChange={handleDateTextChange}
                      placeholder="dd/mm/yyyy"
                      className="w-full rounded-xl border-none bg-surface-container-low py-3 pl-4 pr-12 text-left font-assistant text-body-base text-on-background outline-none transition-shadow placeholder:text-outline focus:ring-2 focus:ring-primary-container"
                    />
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  disabled={saving || !canSave}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-4 font-heebo text-headline-xl text-on-primary-container transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-on-primary-container border-t-transparent" />
                      שומר...
                    </>
                  ) : (
                    <>
                      שמרי שינויים
                      <span className="material-symbols-outlined">check</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Account Actions Card ── */}
        <div className="flex flex-col gap-3 rounded-3xl bg-white p-card-padding soft-shadow">
          <h3 className="font-heebo text-headline-xl text-slate-800">
            חשבון
          </h3>

          {/* Sign out button */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-error-container py-3 font-heebo text-body-base text-on-error-container transition-colors hover:opacity-90 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            התנתקות
          </button>
        </div>

        {/* ── Footer ── */}
        <footer className="flex flex-col items-center gap-2 pb-4 text-center">
          <div className="flex items-center gap-2 text-on-surface-variant opacity-80">
            <span className="material-symbols-outlined text-sm">lock</span>
            <p className="font-assistant text-body-sm">
              הנתונים שלך שמורים בפרטיות ובאבטחה מלאה
            </p>
          </div>
          <p className="font-assistant text-body-sm text-on-surface-variant opacity-60">
            תינוקפדיה v1.0.0
          </p>
        </footer>
      </main>

      <HebrewDatePicker
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelect={handleCalendarSelect}
        selectedDate={parsedEditDate}
      />

      <BottomNav active="profile" onSelect={onTabChange} />
    </div>
  )
}

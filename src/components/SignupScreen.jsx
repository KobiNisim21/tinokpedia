import { useState } from "react"
import { useSignUp, useSignIn } from "@clerk/clerk-react"
import logo from "../assets/logo.webp"
import HebrewDatePicker from "./HebrewDatePicker"
import {
  eddFromInputs,
  parseDdMmYyyy,
} from "../utils/pregnancy"

/** Format raw digits into a dd/mm/yyyy mask as the user types. */
function maskDate(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
  return parts.filter(Boolean).join("/")
}

/** Google SVG icon (4-color G) */
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

/** Segmented-control option for the calculation-method toggle. */
function MethodOption({ label, htmlFor, selected, onSelect }) {
  return (
    <>
      <input
        type="radio"
        id={htmlFor}
        name="calcMethod"
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

/**
 * SignupScreen — מסך הרשמה / התחברות
 *
 * Tabbed auth screen that matches the original HTML design exactly.
 * Register tab: name + method toggle + date picker (signup via Google or email)
 * Login tab: email + password
 */
export default function SignupScreen({ onComplete }) {
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp()
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn()

  const [activeTab, setActiveTab] = useState("register") // "register" | "login"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Register state
  const [name, setName] = useState("")
  const [method, setMethod] = useState("last_period") // "last_period" | "due_date"
  const [dateText, setDateText] = useState("") // dd/mm/yyyy

  // Login state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Calendar state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // OTP verification state
  const [pendingVerification, setPendingVerification] = useState(false)
  const [code, setCode] = useState("")

  const dateLabel =
    method === "due_date" ? "תאריך לידה משוער" : "תאריך וסת אחרון"

  const parsedDate = parseDdMmYyyy(dateText)
  const canSubmitRegister =
    name.trim().length > 0 &&
    parsedDate !== null &&
    email.trim().length > 0 &&
    password.length >= 8
  const canSubmitLogin = email.trim().length > 0 && password.trim().length > 0

  const googleBtnText =
    activeTab === "register"
      ? "התחברות מהירה עם Google"
      : "התחברות עם Google"

  const ctaBtnText =
    activeTab === "register" ? "בואי נתחיל" : "התחברי"

  function handleDateTextChange(event) {
    setDateText(maskDate(event.target.value))
  }

  function handleCalendarSelect(date) {
    const dd = String(date.getDate()).padStart(2, "0")
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    setDateText(`${dd}/${mm}/${date.getFullYear()}`)
  }

  async function handleGoogleSignIn() {
    try {
      if (activeTab === "register") {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        })
      } else {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        })
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "שגיאה בהתחברות עם Google")
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault()
    if (!isSignUpLoaded || !canSubmitRegister) return

    const edd = eddFromInputs(method, parsedDate)
    try {
      setLoading(true)
      setError("")
      await signUp.create({
        emailAddress: email.trim(),
        password,
        unsafeMetadata: {
          name: name.trim(),
          edd: edd.toISOString(),
          calculationMethod: method === "last_period" ? "LMP" : "EDD",
        },
      })
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setPendingVerification(true)
    } catch (err) {
      setError(err.errors?.[0]?.message || "לא ניתן להשלים את ההרשמה")
    } finally {
      setLoading(false)
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault()
    if (!isSignInLoaded || !canSubmitLogin) return
    try {
      setLoading(true)
      setError("")
      const result = await signIn.create({
        identifier: email,
        password,
      })
      if (result.status === "complete") {
        await setSignInActive({ session: result.createdSessionId })
        onComplete(null) // signal login complete — App.jsx loads profile
      } else {
        setError("התחברות נכשלה")
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "שם משתמש או סיסמה שגויים")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(event) {
    event.preventDefault()
    if (!isSignUpLoaded) return
    try {
      setLoading(true)
      setError("")
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === "complete") {
        await setSignUpActive({ session: result.createdSessionId })
      } else {
        setError("האימות נכשל, נסי שוב.")
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "קוד אימות לא חוקי")
    } finally {
      setLoading(false)
    }
  }

  function switchTab(tab) {
    setActiveTab(tab)
    setError("")
  }

  // ── OTP verification screen ──
  if (pendingVerification) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background py-8 font-assistant text-on-background antialiased">
        <div className="flex w-full max-w-[600px] flex-col items-center px-margin-mobile">
          <header className="mb-4 flex w-full flex-col items-center text-center">
            <img src={logo} alt="הלוגו של תינוקפדיה" className="mb-4 h-20 w-20 rounded-full object-cover shadow-sm" />
            <h1 className="mb-2 font-heebo text-headline-3xl-mobile text-primary">אימות כתובת דוא"ל</h1>
            <p className="font-assistant text-body-base text-on-surface-variant">הזיני את הקוד שנשלח אליך במייל</p>
          </header>

          <main className="mb-stack-gap w-full rounded-3xl bg-white p-card-padding shadow-[0_4px_12px_rgba(30,41,59,0.04)]">
            {error && (
              <div className="mb-4 rounded-xl bg-error-container px-4 py-3 text-center font-assistant text-body-sm text-on-error-container">
                {error}
              </div>
            )}
            <form className="flex flex-col gap-6" onSubmit={handleVerifyOTP} noValidate>
              <div className="flex flex-col gap-2">
                <label htmlFor="otpCode" className="font-heebo text-headline-xl text-primary">
                  קוד אימות
                </label>
                <input
                  id="otpCode"
                  type="text"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  dir="ltr"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 text-center font-assistant text-body-base text-on-background outline-none transition-shadow placeholder:text-outline focus:ring-2 focus:ring-primary-container"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-4 font-heebo text-headline-xl text-on-primary-container transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "מאמת..." : "אמתי"}
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            </form>
          </main>
        </div>
      </div>
    )
  }

  // ── Main signup/login screen ──
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background py-8 font-assistant text-on-background antialiased">
      <div className="flex w-full max-w-[600px] flex-col items-center px-margin-mobile">

        {/* ── Header ── */}
        <header className="mb-4 flex w-full flex-col items-center text-center">
          <img
            src={logo}
            alt="הלוגו של תינוקפדיה"
            className="mb-4 h-20 w-20 rounded-full object-cover shadow-sm"
          />
          <h1 className="mb-2 font-heebo text-headline-3xl-mobile text-primary">
            ברוכה הבאה לתינוקפדיה
          </h1>
          <p className="font-assistant text-body-base text-on-surface-variant">
            המסע המופלא שלך מתחיל כאן
          </p>
        </header>

        {/* ── Tabs ── */}
        <div className="flex w-full mb-6 border-b border-surface-variant">
          <button
            type="button"
            onClick={() => switchTab("register")}
            className={`flex-1 pb-2 text-center font-heebo text-lg text-on-surface-variant transition-colors ${
              activeTab === "register"
                ? "border-b-2 border-primary text-primary font-bold"
                : ""
            }`}
          >
            הרשמה
          </button>
          <button
            type="button"
            onClick={() => switchTab("login")}
            className={`flex-1 pb-2 text-center font-heebo text-lg text-on-surface-variant transition-colors ${
              activeTab === "login"
                ? "border-b-2 border-primary text-primary font-bold"
                : ""
            }`}
          >
            התחברות
          </button>
        </div>

        {/* ── Form Card ── */}
        <main className="mb-stack-gap w-full rounded-3xl bg-white p-card-padding shadow-[0_4px_12px_rgba(30,41,59,0.04)]">

          {/* Google Button (shared) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low py-3 font-heebo text-lg text-on-surface transition-colors hover:bg-surface-variant"
          >
            <GoogleIcon />
            <span>{googleBtnText}</span>
          </button>

          {/* Divider */}
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-surface-variant" />
            <span className="font-assistant text-sm text-on-surface-variant">
              או באמצעות דוא"ל וסיסמה
            </span>
            <div className="h-px flex-1 bg-surface-variant" />
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-xl bg-error-container px-4 py-3 text-center font-assistant text-body-sm text-on-error-container">
              {error}
            </div>
          )}

          <form
            className="flex flex-col gap-6 w-full"
            onSubmit={activeTab === "register" ? handleRegisterSubmit : handleLoginSubmit}
            noValidate
          >
            {/* ── Register Tab Content ── */}
            {activeTab === "register" && (
              <div className="flex flex-col gap-6 w-full">
                {/* Name */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="userName"
                    className="font-heebo text-headline-xl text-primary"
                  >
                    מה השם שלך?
                  </label>
                  <input
                    id="userName"
                    name="userName"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                      htmlFor="calcLastPeriod"
                      selected={method === "last_period"}
                      onSelect={() => setMethod("last_period")}
                    />
                    <MethodOption
                      label="לפי תאריך לידה משוער"
                      htmlFor="calcDueDate"
                      selected={method === "due_date"}
                      onSelect={() => setMethod("due_date")}
                    />
                  </div>
                </div>

                {/* Date picker */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="calcDate"
                    className="font-assistant text-body-sm text-on-surface-variant"
                  >
                    {dateLabel}
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
                      id="calcDate"
                      name="calcDate"
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={dateText}
                      onChange={handleDateTextChange}
                      placeholder="dd/mm/yyyy"
                      className="w-full rounded-xl border-none bg-surface-container-low py-3 pl-4 pr-12 text-left font-assistant text-body-base text-on-background outline-none transition-shadow placeholder:text-outline focus:ring-2 focus:ring-primary-container"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email credentials are required for both registration and login. */}
            <div className="flex flex-col gap-6 w-full">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="font-heebo text-headline-xl text-primary"
                  >
                    דוא"ל
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='הכניסי כתובת דוא"ל'
                    className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 font-assistant text-body-base text-on-background outline-none transition-shadow placeholder:text-outline focus:ring-2 focus:ring-primary-container"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="password"
                    className="font-heebo text-headline-xl text-primary"
                  >
                    סיסמה
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={activeTab === "register" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="הכניסי סיסמה"
                    className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 font-assistant text-body-base text-on-background outline-none transition-shadow placeholder:text-outline focus:ring-2 focus:ring-primary-container"
                  />
                </div>
            </div>

            {/* CTA Button */}
            <button
              type="submit"
              disabled={
                loading ||
                (activeTab === "register" ? !canSubmitRegister : !canSubmitLogin)
              }
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-4 font-heebo text-headline-xl text-on-primary-container transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "טוען..." : ctaBtnText}
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          </form>
        </main>

        {/* ── Privacy footer ── */}
        <footer className="flex w-full items-center justify-center gap-2 text-center text-on-surface-variant opacity-80">
          <span className="material-symbols-outlined text-sm">lock</span>
          <p className="font-assistant text-body-sm">
            הנתונים שלך נשמרים בפרטיות ובאבטחה מלאה
          </p>
        </footer>
      </div>

      <HebrewDatePicker
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelect={handleCalendarSelect}
        selectedDate={parsedDate}
      />
    </div>
  )
}

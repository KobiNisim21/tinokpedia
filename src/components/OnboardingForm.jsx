import { useRef, useState } from "react"
import logo from "../assets/logo.png"
import HebrewDatePicker from "./HebrewDatePicker"
import {
  eddFromInputs,
  parseDdMmYyyy,
  isoToDdMmYyyy,
} from "../utils/pregnancy"

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
 * OnboardingForm — השלמת פרטים
 *
 * Shown to authenticated users (e.g. Google sign-in) who haven't completed
 * their pregnancy profile yet (no EDD set). Uses the same design language
 * as the main SignupScreen.
 */
export default function OnboardingForm({ onComplete }) {
  const [name, setName] = useState("")
  const [method, setMethod] = useState("last_period")
  const [dateText, setDateText] = useState("")

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const dateLabel =
    method === "due_date" ? "תאריך לידה משוער" : "תאריך וסת אחרון"

  const parsedDate = parseDdMmYyyy(dateText)
  const canSubmit = name.trim().length > 0 && parsedDate !== null

  function handleDateTextChange(event) {
    setDateText(maskDate(event.target.value))
  }

  function handleCalendarSelect(date) {
    setDateText(isoToDdMmYyyy(date.toISOString()))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    const edd = eddFromInputs(method, parsedDate)
    onComplete({
      name: name.trim(),
      edd,
      calculationMethod: method === "last_period" ? "LMP" : "EDD",
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background py-8 font-assistant text-on-background antialiased">
      <div className="flex w-full max-w-[600px] flex-col items-center px-margin-mobile">

        {/* Header */}
        <header className="mb-4 flex w-full flex-col items-center text-center">
          <img
            src={logo}
            alt="הלוגו של תינוקפדיה"
            className="mb-4 h-20 w-20 rounded-full object-cover shadow-sm"
          />
          <h1 className="mb-2 font-heebo text-headline-3xl-mobile text-primary">
            עוד קצת פרטים...
          </h1>
          <p className="font-assistant text-body-base text-on-surface-variant">
            כדי שנוכל להתאים לך את התוכן הטוב ביותר
          </p>
        </header>

        {/* Form card */}
        <main className="mb-stack-gap w-full rounded-3xl bg-white p-card-padding shadow-[0_4px_12px_rgba(30,41,59,0.04)]">
          <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
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
                  htmlFor="onbCalcLastPeriod"
                  selected={method === "last_period"}
                  onSelect={() => setMethod("last_period")}
                />
                <MethodOption
                  label="לפי תאריך לידה משוער"
                  htmlFor="onbCalcDueDate"
                  selected={method === "due_date"}
                  onSelect={() => setMethod("due_date")}
                />
              </div>
            </div>

                {/* Date picker */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="onbCalcDate"
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
                  id="onbCalcDate"
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

            {/* CTA */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-4 font-heebo text-headline-xl text-on-primary-container transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              בואי נתחיל
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          </form>
        </main>

        {/* Privacy footer */}
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

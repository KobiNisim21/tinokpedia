import { useState } from "react"
import logo from "../assets/logo.png"
import { eddFromInputs, parseInputDate } from "../utils/pregnancy"

/**
 * SignupScreen — מסך הרשמה
 * Collects the user's name and either their last-period date or their
 * estimated due date, then hands a normalized `{ name, edd }` to `onComplete`.
 *
 * Faithful to the login prototype and the Design.md token set.
 */
export default function SignupScreen({ onComplete }) {
  const [name, setName] = useState("")
  const [method, setMethod] = useState("last_period") // "last_period" | "due_date"
  const [dateValue, setDateValue] = useState("")

  const dateLabel =
    method === "due_date" ? "תאריך לידה משוער" : "תאריך וסת אחרון"

  const parsedDate = parseInputDate(dateValue)
  const canSubmit = name.trim().length > 0 && parsedDate !== null

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    const edd = eddFromInputs(method, parsedDate)
    onComplete({ name: name.trim(), edd })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background py-8 font-assistant text-on-background antialiased">
      <div className="flex w-full max-w-[600px] flex-col items-center px-margin-mobile">
        {/* Header */}
        <header className="mb-stack-gap flex w-full flex-col items-center text-center">
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

        {/* Form card */}
        <main className="mb-stack-gap w-full rounded-3xl bg-white p-card-padding soft-shadow">
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
              <div
                role="radiogroup"
                aria-label="שיטת חישוב גיל ההריון"
                className="flex rounded-xl bg-surface-container-low p-1"
              >
                <MethodOption
                  label="לפי וסת אחרון"
                  selected={method === "last_period"}
                  onSelect={() => setMethod("last_period")}
                />
                <MethodOption
                  label="לפי תאריך לידה משוער"
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
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                  calendar_month
                </span>
                <input
                  id="calcDate"
                  name="calcDate"
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="w-full appearance-none rounded-xl border-none bg-surface-container-low py-3 pl-4 pr-12 font-assistant text-body-base text-on-background outline-none transition-shadow focus:ring-2 focus:ring-primary-container"
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
          <span className="material-symbols-outlined text-base">lock</span>
          <p className="font-assistant text-body-sm">
            הנתונים שלך נשמרים בפרטיות ובאבטחה מלאה
          </p>
        </footer>
      </div>
    </div>
  )
}

/** Segmented-control option for the calculation-method toggle. */
function MethodOption({ label, selected, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex-1 rounded-lg py-2 text-center font-assistant text-body-base transition-colors duration-200 ${
        selected
          ? "bg-surface-variant font-semibold text-on-surface"
          : "text-on-surface-variant"
      }`}
    >
      {label}
    </button>
  )
}

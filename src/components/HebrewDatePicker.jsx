import { useState } from "react"

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
]

// RTL order: שבת first (rightmost), then ו׳ … א׳
const HEBREW_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"]

/**
 * HebrewDatePicker — בורר תאריך בעברית
 *
 * A fully localized Hebrew calendar popup. Opens as a modal overlay.
 * Props:
 *  - isOpen (boolean)
 *  - onClose (function)
 *  - onSelect (function) — called with a Date object when a day is picked
 *  - selectedDate (Date|null) — currently selected date for highlight
 */
export default function HebrewDatePicker({ isOpen, onClose, onSelect, selectedDate }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() || today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth())

  if (!isOpen) return null

  // First day of the displayed month
  const firstDay = new Date(viewYear, viewMonth, 1)
  const startDow = firstDay.getDay() // 0=Sun … 6=Sat
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  // Build the 6×7 grid of day cells
  const cells = []
  // Empty cells before the 1st
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  function handleDayClick(day) {
    if (!day) return
    const picked = new Date(viewYear, viewMonth, day)
    onSelect(picked)
    onClose()
  }

  function isToday(day) {
    return (
      day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear()
    )
  }

  function isSelected(day) {
    if (!selectedDate || !day) return false
    return (
      day === selectedDate.getDate() &&
      viewMonth === selectedDate.getMonth() &&
      viewYear === selectedDate.getFullYear()
    )
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[360px] rounded-3xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Month/Year nav */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>

          <h3 className="font-heebo text-headline-xl text-slate-800">
            {HEBREW_MONTHS[viewMonth]} {viewYear}
          </h3>

          <button
            type="button"
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
        </div>

        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {HEBREW_DAYS.map((d) => (
            <div
              key={d}
              className="py-1 text-center font-heebo text-label-caps text-on-surface-variant"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} />
            }

            const sel = isSelected(day)
            const tod = isToday(day)

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`flex h-10 w-full items-center justify-center rounded-full font-assistant text-body-base transition-all duration-150 ${
                  sel
                    ? "bg-primary font-semibold text-on-primary shadow-sm"
                    : tod
                      ? "bg-primary-container font-semibold text-on-primary-container"
                      : "text-slate-800 hover:bg-surface-container-low active:scale-90"
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Today shortcut + close */}
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setViewMonth(today.getMonth())
              setViewYear(today.getFullYear())
            }}
            className="font-heebo text-body-sm text-primary transition-opacity hover:opacity-70"
          >
            היום
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-heebo text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            סגירה
          </button>
        </div>
      </div>
    </div>
  )
}

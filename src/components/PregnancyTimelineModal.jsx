import { useState, useEffect, useMemo, useRef } from "react"
import { syncUserProfile } from "../services/api"
import { useAuth, useUser } from "@clerk/clerk-react"
import { readStoredJson, userStorageKey, writeStoredJson } from "../utils/storage"

// ---------------------------------------------------------------------------
// Complete Israeli pregnancy test schedule (based on Clalit reference images).
//
// startWeek  = the week the connector exits from on the timeline.
// endWeek    = the last week of the recommended window.
// side       = "right" | "left" – physical screen side.
// color      = colour used for the bracket line and info badge.
//
// Date formula:
//   start date = pregnancyStart + startWeek * 7
//   end date   = pregnancyStart + endWeek * 7 + 6
// ---------------------------------------------------------------------------
const TESTS = [
  // --- Trimester 1 ---
  { id: "doctor_visit_6",   startWeek: 6,  endWeek: 8,  title: "ביקור רופא והפניה לבדיקות",                         side: "right", color: "#8fa8bd" },
  { id: "ultrasound_6",     startWeek: 6,  endWeek: 8,  title: "אולטרסאונד מיילדותי",                               side: "left",  color: "#5fc9b0" },
  { id: "nurse_open_9",     startWeek: 9,  endWeek: 12, title: "פתיחת תיק מעקב הריון אחות",                         side: "left",  color: "#f0b955" },
  { id: "sakar_11",         startWeek: 11, endWeek: 13, title: "בדיקת סקר שליש ראשון (שקיפות עורפית ובדיקת דם)",   side: "right", color: "#c08fd4" },

  // --- Trimester 2 ---
  { id: "skira_early_14",   startWeek: 14, endWeek: 16, title: "סקירת מערכות מוקדמת",                               side: "left",  color: "#ec4899" },
  { id: "nurse_16",         startWeek: 16, endWeek: 19, title: "אחות ליווי הריון",                                  side: "right", color: "#8c8c8c" },
  { id: "sakar_2_18",       startWeek: 18, endWeek: 19, title: "סקר ביוכימי שני (חלבון עוברי)",                     side: "right", color: "#f0b955" },
  { id: "doctor_19",        startWeek: 19, endWeek: 20, title: "בדיקת רופא",                                        side: "left",  color: "#5fd0b4" },
  { id: "skira_late_21",    startWeek: 21, endWeek: 24, title: "סקירת מערכות מאוחרת",                               side: "right", color: "#a8c4e0" },
  { id: "blood_count_24",   startWeek: 24, endWeek: 28, title: "ספירת דם",                                          side: "right", color: "#b184d6" },
  { id: "glucose_24",       startWeek: 24, endWeek: 28, title: "בדיקת דם לאיתור סוכרת הריונית",                    side: "left",  color: "#f97316" },
  { id: "urine_26",         startWeek: 26, endWeek: 28, title: "תרבית שתן",                                         side: "right", color: "#cba4de" },
  { id: "nurse_27",         startWeek: 27, endWeek: 28, title: "אחות ליווי הריון",                                  side: "left",  color: "#8c8c8c" },

  // --- Trimester 3 ---
  { id: "vaccine_28",       startWeek: 28, endWeek: 36, title: "חיסון שעלת (טטנוס, דיפתריה, שעלת)",               side: "right", color: "#7dd957" },
  { id: "doctor_29",        startWeek: 29, endWeek: 32, title: "בדיקת רופא",                                        side: "right", color: "#7fb3e8" },
  { id: "nurse_31",         startWeek: 31, endWeek: 33, title: "אחות ליווי הריון",                                  side: "left",  color: "#f0b955" },
  { id: "weight_32",        startWeek: 32, endWeek: 36, title: "הערכת משקל",                                         side: "left",  color: "#b0a4d4" },
  { id: "nurse_34",         startWeek: 34, endWeek: 38, title: "אחות ליווי הריון",                                  side: "left",  color: "#c4b5e8" },
  { id: "doctor_35",        startWeek: 35, endWeek: 36, title: "בדיקת רופא",                                        side: "right", color: "#7dd3e8" },
  { id: "doctor_39",        startWeek: 39, endWeek: 40, title: "בדיקת רופא",                                        side: "right", color: "#f2a0b5" },
]

// --- Layout geometry (all values in px, computed once) ----------------------
const START_WEEK = 6
const END_WEEK = 40
const ROW_H = 112        // vertical distance between two week circles
const CIRCLE = 60        // week circle diameter
const TOP_PAD = 28
const BOTTOM_PAD = 56
const LANE_0 = 52        // distance from the spine to the first bracket lane
const LANE_STEP = 32     // extra distance for each additional lane
const CARD_INNER = 36    // distance from the spine to the card's inner edge
const CARD_W = 130
const CARD_GAP = 14      // minimum vertical gap between two cards on one side
const BADGE = 26
const CHARS_PER_LINE = 15

const weekY = (w) => TOP_PAD + CIRCLE / 2 + (w - START_WEEK) * ROW_H
const TIMELINE_H = weekY(END_WEEK) + CIRCLE / 2 + BOTTOM_PAD

const cardHeight = (title) => {
  const lines = Math.max(1, Math.ceil(title.length / CHARS_PER_LINE))
  return BADGE + 6 + lines * 17 + 6 + 30
}

// Assign each test a lane (so overlapping brackets never sit on top of each
// other) and a card top (so cards on the same side never overlap either).
const LAYOUT = (() => {
  const sorted = [...TESTS].sort(
    (a, b) => a.startWeek - b.startWeek || a.endWeek - b.endWeek,
  )

  // 1. Lane assignment: reuse a lane only once its previous test has ended.
  const laneEnds = { right: [], left: [] }
  const placed = sorted.map((t) => {
    const lanes = laneEnds[t.side]
    let lane = 0
    while (lane < lanes.length && lanes[lane] >= t.startWeek) lane++
    lanes[lane] = t.endWeek
    return { ...t, lane }
  })

  // 2. Card placement: centre on the bracket, then push down to clear the
  //    previous card on that side.
  for (const side of ["right", "left"]) {
    let lastBottom = -Infinity
    placed
      .filter((t) => t.side === side)
      .forEach((t) => {
        const h = cardHeight(t.title)
        const mid = (weekY(t.startWeek) + weekY(t.endWeek)) / 2
        let top = mid - h / 2
        if (top < lastBottom + CARD_GAP) top = lastBottom + CARD_GAP
        t.cardTop = top
        t.cardH = h
        lastBottom = top + h
      })
  }

  return placed
})()

export default function PregnancyTimelineModal({ isOpen, onClose, edd, profile, setProfile }) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [completed, setCompleted] = useState({})
  const scrollRef = useRef(null)
  const completedStorageKey = userStorageKey(user?.id, "completed-tests")

  // Initialize from profile / localStorage
  useEffect(() => {
    if (isOpen) {
      if (profile?.completedTests) {
        const map = {}
        profile.completedTests.forEach(t => map[t] = true)
        setCompleted(map)
      } else {
        setCompleted(readStoredJson(completedStorageKey, {}))
      }
    }
  }, [completedStorageKey, isOpen, profile])

  // Compute Pregnancy Start Date (EDD - 280 days)
  const pregnancyStart = useMemo(() => {
    if (!edd) return new Date()
    const d = new Date(edd)
    d.setDate(d.getDate() - 280)
    return d
  }, [edd])

  // Calculate current week
  const currentWeek = useMemo(() => {
    if (!edd) return 0
    const today = new Date()
    const diffTime = new Date(edd).getTime() - today.getTime()
    const weeksToDue = Math.floor(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) / 7)
    return 40 - weeksToDue
  }, [edd])

  const formatDate = (date) =>
    date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Start of a week
  const getWeekDate = (week) => {
    const d = new Date(pregnancyStart)
    d.setDate(d.getDate() + week * 7)
    return d
  }

  // End of a week (last day of that week)
  const getWeekEndDate = (week) => {
    const d = new Date(pregnancyStart)
    d.setDate(d.getDate() + week * 7 + 6)
    return d
  }

  // Scroll to the current week when the board opens
  useEffect(() => {
    if (!isOpen || !scrollRef.current) return
    const w = Math.min(Math.max(currentWeek, START_WEEK), END_WEEK)
    scrollRef.current.scrollTop = Math.max(0, weekY(w) - 220)
  }, [isOpen, currentWeek])

  const toggleTest = async (testId) => {
    const previousCompleted = completed
    const nextCompleted = { ...completed, [testId]: !completed[testId] }
    setCompleted(nextCompleted)
    writeStoredJson(completedStorageKey, nextCompleted)

    // Save to backend
    if (profile) {
      const arr = Object.keys(nextCompleted).filter(k => nextCompleted[k])
      try {
        const token = await getToken()
        if (!token) throw new Error("Missing session token")
        const updated = await syncUserProfile(token, { ...profile, completedTests: arr })
        setProfile({
          ...updated,
          edd: updated.edd ? new Date(updated.edd) : profile.edd,
        })
      } catch (err) {
        console.error("Failed to sync tests to backend", err)
        setCompleted(previousCompleted)
        writeStoredJson(completedStorageKey, previousCompleted)
      }
    }
  }

  if (!isOpen) return null

  const weeks = Array.from({ length: END_WEEK - START_WEEK + 1 }, (_, i) => i + START_WEEK)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* Header */}
      <header className="flex items-center justify-between bg-surface px-margin-mobile py-4 shadow-sm">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:opacity-80 transition-opacity duration-200 p-2"
        >
          <span className="material-symbols-outlined text-2xl">arrow_forward</span>
        </button>
        <h1 className="font-headline-xl text-headline-xl text-primary font-bold">לוח בדיקות הריון</h1>
        <div className="w-10" />
      </header>

      {/* Timeline Scrollable Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2">
        <div className="relative mx-auto w-full max-w-[600px]" style={{ height: TIMELINE_H }}>

          {/* Central spine */}
          <div
            className="absolute left-1/2 -z-10 -translate-x-1/2"
            style={{
              top: weekY(START_WEEK),
              height: weekY(END_WEEK) + 48 - weekY(START_WEEK),
              width: 2,
              backgroundColor: '#b4edef',
            }}
          />

          {/* Brackets: exit at startWeek, run down, return at endWeek */}
          {LAYOUT.map((t) => {
            const laneX = LANE_0 + t.lane * LANE_STEP
            const y1 = weekY(t.startWeek)
            const y2 = weekY(t.endWeek)
            const isDone = completed[t.id]
            const isRight = t.side === "right"
            return (
              <div
                key={`br-${t.id}`}
                className="absolute z-0 pointer-events-none"
                style={{
                  top: y1,
                  height: y2 - y1,
                  width: laneX,
                  [isRight ? "left" : "right"]: "50%",
                  borderTop: `2px solid ${t.color}`,
                  borderBottom: `2px solid ${t.color}`,
                  [isRight ? "borderRight" : "borderLeft"]: `2px solid ${t.color}`,
                  [isRight ? "borderTopRightRadius" : "borderTopLeftRadius"]: 16,
                  [isRight ? "borderBottomRightRadius" : "borderBottomLeftRadius"]: 16,
                  opacity: isDone ? 0.3 : 1,
                }}
              />
            )
          })}

          {/* Test cards */}
          {LAYOUT.map((t) => {
            const laneX = LANE_0 + t.lane * LANE_STEP
            const isDone = completed[t.id]
            const isRight = t.side === "right"
            const badgeOffset = laneX - CARD_INNER - BADGE / 2
            return (
              <div
                key={`card-${t.id}`}
                className="absolute z-10"
                style={{
                  top: t.cardTop,
                  width: CARD_W,
                  [isRight ? "left" : "right"]: `calc(50% + ${CARD_INNER}px)`,
                }}
              >
                {/* Badge sits on the bracket line and toggles "done" */}
                <button
                  onClick={() => toggleTest(t.id)}
                  aria-label={`סמן כבוצע: ${t.title}`}
                  className="relative flex items-center justify-center rounded-full text-white shadow-sm transition-transform active:scale-95"
                  style={{
                    width: BADGE,
                    height: BADGE,
                    marginRight: isRight ? 0 : badgeOffset,
                    marginLeft: isRight ? badgeOffset : 0,
                    backgroundColor: isDone ? "#2e6769" : t.color,
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isDone ? "check" : "info"}
                  </span>
                </button>

                <div className={`mt-1.5 rounded-xl bg-white/80 px-1.5 py-1 ${isDone ? "opacity-60" : ""}`}>
                  <h4
                    className={`font-headline-xl text-[13px] font-bold leading-[17px] ${isDone ? "text-slate-400 line-through" : "text-primary underline decoration-1 underline-offset-2"}`}
                  >
                    {t.title}
                  </h4>
                  <p className="mt-1 text-[11px] font-bold leading-[15px] text-slate-500">
                    {formatDate(getWeekDate(t.startWeek))}
                    <br />
                    עד {formatDate(getWeekEndDate(t.endWeek))}
                  </p>
                </div>
              </div>
            )
          })}

          {/* Week circles */}
          {weeks.map((week) => {
            const isCurrent = week === currentWeek
            return (
              <div
                key={week}
                className={`absolute left-1/2 z-20 flex -translate-x-1/2 flex-col items-center justify-center rounded-full text-center font-bold leading-tight text-white shadow-md ${isCurrent ? "bg-rose-600 ring-4 ring-rose-100" : "bg-primary"}`}
                style={{
                  width: CIRCLE,
                  height: CIRCLE,
                  top: weekY(week) - CIRCLE / 2,
                }}
              >
                <span className="font-body-sm text-[11px] font-normal opacity-90">שבוע</span>
                <span className="font-headline-3xl-mobile text-[19px] leading-none">{String(week).padStart(2, "0")}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

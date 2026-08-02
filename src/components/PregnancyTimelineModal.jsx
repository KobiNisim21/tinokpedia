import { useState, useEffect, useMemo } from "react"
import { syncUserProfile } from "../services/api"
import { useAuth } from "@clerk/clerk-react"

const TESTS = [
  { id: "nurse_10", startWeek: 10, endWeek: 12, title: "אחות ליווי הריון", color: "text-teal-600", border: "border-teal-400", side: "right" },
  { id: "sakar_11", startWeek: 11, endWeek: 13, title: "בדיקת סקר שליש ראשון (שקיפות עורפית ובדיקת דם)", color: "text-purple-600", border: "border-purple-400", side: "left" },
  { id: "skira_early_14", startWeek: 14, endWeek: 16, title: "סקירת מערכות מוקדמת", color: "text-pink-600", border: "border-pink-400", side: "right" },
  { id: "nurse_16", startWeek: 16, endWeek: 19, title: "אחות ליווי הריון", color: "text-blue-600", border: "border-blue-400", side: "left" },
  { id: "sakar_2_16", startWeek: 16, endWeek: 20, title: "סקר ביוכימי שני (חלבון עוברי)", color: "text-slate-600", border: "border-slate-400", side: "left", offsetLine: true },
  { id: "doctor_18", startWeek: 18, endWeek: 20, title: "בדיקת רופא", color: "text-emerald-600", border: "border-emerald-400", side: "right" },
  { id: "skira_late_21", startWeek: 21, endWeek: 24, title: "סקירת מערכות מאוחרת", color: "text-blue-500", border: "border-blue-300", side: "left" },
  { id: "glucose_24", startWeek: 24, endWeek: 28, title: "בדיקת דם לאיתור סוכרת הריונית", color: "text-orange-600", border: "border-orange-400", side: "right" },
  { id: "blood_24", startWeek: 24, endWeek: 28, title: "ספירת דם ותרבית שתן", color: "text-indigo-600", border: "border-indigo-400", side: "left" },
  { id: "nurse_24", startWeek: 24, endWeek: 28, title: "אחות ליווי הריון", color: "text-teal-600", border: "border-teal-400", side: "right", offsetLine: true },
  { id: "vaccine_27", startWeek: 27, endWeek: 36, title: "חיסון שעלת (טטנוס, דיפתריה, שעלת)", color: "text-green-600", border: "border-green-400", side: "left" },
  { id: "nurse_27", startWeek: 27, endWeek: 31, title: "אחות ליווי הריון", color: "text-purple-600", border: "border-purple-400", side: "right" },
  { id: "doctor_29", startWeek: 29, endWeek: 31, title: "בדיקת רופא", color: "text-blue-600", border: "border-blue-400", side: "left" },
  { id: "doctor_39", startWeek: 39, endWeek: 40, title: "בדיקת רופא", color: "text-rose-600", border: "border-rose-400", side: "left" },
]

export default function PregnancyTimelineModal({ isOpen, onClose, edd, profile, setProfile }) {
  const { getToken } = useAuth()
  const [completed, setCompleted] = useState({})

  // Initialize from profile / localStorage
  useEffect(() => {
    if (isOpen) {
      if (profile?.completedTests) {
        const map = {}
        profile.completedTests.forEach(t => map[t] = true)
        setCompleted(map)
      } else {
        try {
          const raw = localStorage.getItem("tinokpedia_tests_completed")
          if (raw) setCompleted(JSON.parse(raw))
        } catch {}
      }
    }
  }, [isOpen, profile])

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

  const formatDate = (date) => {
    return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getWeekDate = (weekOffset) => {
    const d = new Date(pregnancyStart)
    d.setDate(d.getDate() + (weekOffset * 7))
    return d
  }

  const toggleTest = async (testId) => {
    const nextCompleted = { ...completed, [testId]: !completed[testId] }
    setCompleted(nextCompleted)
    
    // Save to local storage
    try {
      localStorage.setItem("tinokpedia_tests_completed", JSON.stringify(nextCompleted))
    } catch {}

    // Save to backend
    if (profile) {
      const arr = Object.keys(nextCompleted).filter(k => nextCompleted[k])
      try {
        const token = await getToken()
        const updated = await syncUserProfile(token, { ...profile, completedTests: arr })
        setProfile(updated)
      } catch (err) {
        console.error("Failed to sync tests to backend", err)
      }
    }
  }

  if (!isOpen) return null

  const weeks = Array.from({ length: 31 }, (_, i) => i + 10) // 10 to 40

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <h2 className="font-heebo text-headline-sm font-bold text-slate-800">
          לוח בדיקות הריון
        </h2>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-slate-500 hover:bg-surface-container"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Timeline Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="relative mx-auto max-w-[600px] py-4">
          
          {/* Main vertical line */}
          <div className="absolute bottom-0 top-0 left-1/2 w-0.5 -translate-x-1/2 bg-cyan-200"></div>

          {weeks.map(week => {
            const isCurrent = week === currentWeek
            const weekTests = TESTS.filter(t => t.startWeek === week)
            
            return (
              <div key={week} className="relative mb-16 flex items-center justify-center">
                
                {/* Central Week Node */}
                <div className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full shadow-md text-white font-bold text-center leading-tight transition-transform ${isCurrent ? 'bg-rose-600 scale-110 shadow-rose-200/50 ring-4 ring-rose-100' : 'bg-cyan-600'}`}>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-normal opacity-90">שבוע</span>
                    <span className="text-xl">{week}</span>
                  </div>
                </div>

                {/* Tests for this week */}
                {weekTests.map((test, idx) => {
                  const isLeft = test.side === 'left'
                  const isDone = completed[test.id]
                  const startDate = formatDate(getWeekDate(test.startWeek))
                  const endDate = formatDate(getWeekDate(test.endWeek))
                  
                  return (
                    <div 
                      key={test.id} 
                      className={`absolute top-1/2 -translate-y-1/2 w-[calc(50%-40px)] flex flex-col ${isLeft ? 'left-0 items-start pr-4' : 'right-0 items-end pl-4'}`}
                      style={{ marginTop: test.offsetLine ? '60px' : '0px' }}
                    >
                      {/* Connecting Line */}
                      <div className={`absolute top-1/2 h-[2px] w-8 bg-gradient-to-r ${isLeft ? 'right-0 from-transparent to-cyan-300' : 'left-0 from-cyan-300 to-transparent'}`} />

                      {/* Card */}
                      <div className={`relative w-full rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition-all ${isDone ? 'opacity-70 bg-slate-50' : 'hover:shadow-md'}`}>
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => toggleTest(test.id)}
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isDone ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white'}`}
                          >
                            {isDone && <span className="material-symbols-outlined text-[16px]">check</span>}
                          </button>
                          
                          <div className={`flex flex-col text-${isLeft ? 'right' : 'left'} w-full`}>
                            <h4 className={`font-body-base font-bold leading-tight ${isDone ? 'text-slate-500 line-through' : test.color}`}>
                              {test.title}
                            </h4>
                            <p className="mt-1 font-body-sm text-[11px] text-slate-500">
                              {startDate} <br/> עד {endDate}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from "react"
import Header from "./Header"
import PregnancyCircleProgressBar from "./PregnancyCircleProgressBar"
import DataBar from "./DataBar"
import DashboardContentAccordions from "./DashboardContentAccordions"
import BottomNav from "./BottomNav"
import PWAInstallBanner from "./PWAInstallBanner"
import { pregnancyStatus } from "../utils/pregnancy"
import { pregnancyWeeksData } from "../data/pregnancyWeeksData"

// Auto-import available weekly illustrations
const weekImageLoaders = import.meta.glob("../assets/illustrations/week*.webp")

function getWeekImageLoader(week) {
  const key = Object.keys(weekImageLoaders)
    .find((path) => path.toLowerCase().endsWith(`week${week}.webp`))
  return key ? weekImageLoaders[key] : null
}

function greetingForHour(hour) {
  if (hour >= 5 && hour < 12) return "בוקר טוב"
  if (hour >= 12 && hour < 17) return "צהריים טובים"
  if (hour >= 17 && hour < 21) return "אחר הצהריים טובים"
  return "ערב טוב"
}

/**
 * DashboardLayout
 * The weekly tracking screen. Receives the user's name and estimated due date
 * (EDD) and derives the current week/day/progress from it.
 */
export default function DashboardLayout({ name = "את", edd, onTabChange, notificationProps = {}, onOpenTimeline }) {
  const status = pregnancyStatus(edd)
  const { week, day, daysToDue, progress } = status
  const [weekImage, setWeekImage] = useState(null)

  useEffect(() => {
    let active = true
    const loadImage = getWeekImageLoader(week)
    setWeekImage(null)
    if (loadImage) {
      loadImage()
        .then((module) => {
          if (active) setWeekImage(module.default)
        })
        .catch(() => {
          if (active) setWeekImage(null)
        })
    }
    return () => {
      active = false
    }
  }, [week])

  const greeting = greetingForHour(new Date().getHours())
  
  const currentWeekData = pregnancyWeeksData[week] || pregnancyWeeksData[14]
  const tipsContent = currentWeekData.tips?.content || currentWeekData.mother?.tipContent || ""
  const tipsTitle = currentWeekData.tips?.title || "טיפ שבועי / בדיקות מומלצות"

  const accordionItems = [
    {
      title: currentWeekData.fetus?.title || "מה קורה לעובר השבוע?",
      body: (
        <div className="flex flex-col gap-3">
          <span>{currentWeekData.fetus?.content}</span>
          {currentWeekData.fetus?.size && currentWeekData.fetus.size !== "placeholder_graphic" && (
            <span className="inline-block w-fit rounded-full bg-primary-container px-3 py-1 text-sm font-medium text-on-primary-container">
              גודל מוערך: {currentWeekData.fetus.size}
            </span>
          )}
        </div>
      ),
      variant: "default",
    },
    {
      title: currentWeekData.mother?.title || "מה קורה לגוף שלך?",
      body: <span>{currentWeekData.mother?.content}</span>,
      variant: "default",
    },
    {
      title: tipsTitle,
      body: <span>{tipsContent}</span>,
      variant: "tip",
    },
  ]

  const totalSegments = 7
  const filledSegments = Math.max(1, Math.round(progress * totalSegments))

  return (
    <div className="flex min-h-screen flex-col md:items-center">
      <Header {...notificationProps} />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-stack-gap px-margin-mobile py-6 pb-24 md:pb-6">
        {/* Greeting */}
        <div className="mb-2">
          <h2 className="font-heebo text-headline-3xl-mobile text-slate-800">
            {greeting}, {name} 👋
          </h2>
        </div>

        {/* Timeline Banner */}
        <button 
          onClick={onOpenTimeline}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-500 to-cyan-500 p-4 text-right shadow-sm transition-all hover:shadow-md active:scale-95"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-heebo text-body-lg font-bold text-white">
                לוח בדיקות הריון 🩺
              </span>
              <span className="mt-1 font-body-sm text-cyan-50">
                צפי בבדיקה הקרובה שלך
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
              <span className="material-symbols-outlined">arrow_back</span>
            </div>
          </div>
          {/* Decorative background shapes */}
          <div className="absolute -left-4 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute -bottom-10 right-10 h-20 w-20 rounded-full bg-white/10 blur-xl"></div>
        </button>

        {/* PWA install prompt */}
        <PWAInstallBanner />

        {/* Hero illustration + progress ring */}
        <PregnancyCircleProgressBar week={week} imageSrc={weekImage} />

        {/* Week data */}
        <DataBar
          weeks={week}
          days={day}
          daysToDue={daysToDue}
          trimester={currentWeekData.trimester}
          filledSegments={filledSegments}
          totalSegments={totalSegments}
        />

        {/* Expandable weekly content */}
        <div className="mt-2">
          <DashboardContentAccordions items={accordionItems} />
        </div>
      </main>

      <BottomNav active="tracking" onSelect={onTabChange} />
    </div>
  )
}

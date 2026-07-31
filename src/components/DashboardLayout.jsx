import Header from "./Header"
import PregnancyCircleProgressBar from "./PregnancyCircleProgressBar"
import DataBar from "./DataBar"
import DashboardContentAccordions from "./DashboardContentAccordions"
import BottomNav from "./BottomNav"
import { pregnancyStatus } from "../utils/pregnancy"
import { pregnancyWeeksData } from "../data/pregnancyWeeksData"

// Auto-import available weekly illustrations
const weekImages = import.meta.glob("../assets/illustrations/**/*.{png,PNG}", {
  eager: true,
})

function getWeekImage(week) {
  const key = Object.keys(weekImages)
    .sort((a, b) => a.length - b.length)
    .find((k) => k.toLowerCase().endsWith(`week${week}.png`))
  return key ? weekImages[key].default : null
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
export default function DashboardLayout({ name = "את", edd, onTabChange }) {
  const status = pregnancyStatus(edd)
  const { week, day, daysToDue, progress } = status

  const weekImage = getWeekImage(week)
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
      <Header />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-stack-gap px-margin-mobile py-6 pb-24 md:pb-6">
        {/* Greeting */}
        <div className="mb-2">
          <h2 className="font-heebo text-headline-3xl-mobile text-slate-800">
            {greeting}, {name} 👋
          </h2>
        </div>

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

import Header from "./Header"
import PregnancyCircleProgressBar from "./PregnancyCircleProgressBar"
import DataBar from "./DataBar"
import DashboardContentAccordions from "./DashboardContentAccordions"
import BottomNav from "./BottomNav"
import { pregnancyStatus } from "../utils/pregnancy"

// Auto-import available weekly illustrations (week1..weekN, .png/.PNG)
const weekImages = import.meta.glob("../assets/illustrations/week*.{png,PNG}", {
  eager: true,
})

function getWeekImage(week) {
  const key = Object.keys(weekImages).find((k) =>
    k.toLowerCase().includes(`week${week}.png`),
  )
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
export default function DashboardLayout({ name = "את", edd }) {
  const status = pregnancyStatus(edd)
  const { week, day, daysToDue, progress } = status

  const weekImage = getWeekImage(week)
  const greeting = greetingForHour(new Date().getHours())

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
          filledSegments={filledSegments}
          totalSegments={totalSegments}
        />

        {/* Expandable weekly content */}
        <div className="mt-2">
          <DashboardContentAccordions />
        </div>
      </main>

      <BottomNav active="tracking" />
    </div>
  )
}

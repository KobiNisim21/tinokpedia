/**
 * DataBar — נתוני השבוע הנוכחי
 * Big current-week number, weeks+days detail, a "days to meeting" chip,
 * and a segmented trimester progress bar. Matches the dashboard prototype.
 */
export default function DataBar({
  weeks = 14,
  days = 3,
  daysToDue = 179,
  totalSegments = 7,
  filledSegments = 3,
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-white p-card-padding text-center soft-shadow">
      <div className="flex flex-col">
        <span className="font-heebo text-headline-3xl font-bold text-primary">
          שבוע {weeks}
        </span>
        <span className="font-assistant text-body-base text-slate-500">
          {weeks} שבועות ו-{days} ימים
        </span>
      </div>

      <div className="mt-2 inline-flex items-center rounded-full bg-primary-container px-4 py-1.5 font-heebo text-label-caps text-on-primary-container">
        עוד {daysToDue} ימים למפגש
      </div>

      {/* Segmented progress bar */}
      <div className="mt-4 flex h-2 w-full gap-1">
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full ${
              i < filledSegments ? "bg-primary" : "bg-surface-container-high"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

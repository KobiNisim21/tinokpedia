/**
 * PregnancyCircleProgressBar
 * Weekly illustration centered inside a wrapping SVG progress ring.
 * The ring fills according to pregnancy progress (week / totalWeeks).
 *
 * Uses a 0–100 viewBox with r=45 (circumference ≈ 283) to match the prototype.
 * The illustration is a temporary placeholder — swap `imageSrc` in later.
 */
export default function PregnancyCircleProgressBar({
  week = 14,
  totalWeeks = 40,
  imageSrc,
  imageAlt,
}) {
  const progress = Math.min(Math.max(week / totalWeeks, 0), 1)
  const RADIUS = 45
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS // ≈ 282.74
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-white p-card-padding soft-shadow">
      <div className="relative flex h-64 w-64 items-center justify-center">
        {/* Progress Ring */}
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 100 100"
          role="img"
          aria-label={`התקדמות הריון: ${Math.round(progress * 100)}%`}
        >
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="#f5f5f4"
            strokeWidth="4"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="#ccfbf1"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>

        {/* Weekly illustration */}
        <div className="relative z-10 flex h-56 w-56 items-center justify-center overflow-hidden rounded-full bg-transparent">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={imageAlt || `איור שבוע ${week}`}
              className="h-full w-full object-cover scale-[1.15]"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          ) : (
            <span className="text-7xl" role="img" aria-label="איור שבועי">
              👶
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

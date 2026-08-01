import { useEffect } from "react"

const AVATAR_COLORS = [
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-primary-container text-on-primary-container",
]

/** Format a date as relative time in Hebrew. */
function timeAgo(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMin = Math.floor((now - then) / 60000)
  if (diffMin < 1) return "ממש עכשיו"
  if (diffMin < 60) return `לפני ${diffMin} דקות`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `לפני ${diffHr === 1 ? "שעה" : `${diffHr} שעות`}`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return "אתמול"
  return `לפני ${diffDay} ימים`
}

/**
 * NotificationsModal — slide-down overlay for notifications.
 *
 * Props:
 *  - isOpen (boolean)
 *  - onClose (function)
 *  - notifications (array) — [{ id, authorName, isAnonymous, message, createdAt, read }]
 *  - onMarkAllRead (function) — called when modal opens to clear badge
 */
export default function NotificationsModal({
  isOpen,
  onClose,
  notifications = [],
  onMarkAllRead,
}) {
  // Mark all as read when opened
  useEffect(() => {
    if (isOpen && onMarkAllRead) {
      onMarkAllRead()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-800/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — slides from top */}
      <div
        className="relative mx-auto mt-0 flex w-full max-w-[600px] flex-col rounded-b-3xl bg-white shadow-2xl animate-in"
        style={{ maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <h3 className="font-headline-xl text-headline-xl text-primary">
            התראות
          </h3>
          {/* Spacer for centering */}
          <div className="w-6" />
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="material-symbols-outlined text-primary text-[40px]">
                notifications_none
              </span>
              <p className="font-heebo text-headline-xl text-slate-800">
                אין התראות חדשות כרגע
              </p>
              <p className="font-assistant text-body-sm text-on-surface-variant">
                כשמישהי תגיב או תעשה לייק לפוסט שלך, תקבלי התראה כאן 🔔
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif, idx) => {
                const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                return (
                  <div
                    key={notif.id || idx}
                    className="flex gap-4 border-b border-surface-container py-4 last:border-0"
                  >
                    {/* Avatar */}
                    {notif.isAnonymous ? (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-high text-slate-500">
                        <span className="material-symbols-outlined text-base">
                          person_outline
                        </span>
                      </div>
                    ) : (
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-headline-xl text-base ${colorClass}`}
                      >
                        {(notif.authorName || "?").split(" ").filter(Boolean).length >= 2
                          ? notif.authorName.split(" ")[0][0] + notif.authorName.split(" ")[1][0]
                          : (notif.authorName || "?").slice(0, 2)}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex flex-col gap-1">
                      <p className="font-body-base text-body-base text-slate-800">
                        <span className="font-bold">{notif.authorName}</span>{" "}
                        {notif.message}
                      </p>
                      <span className="font-body-sm text-body-sm text-slate-500">
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Header — סרגל עליון קבוע (Top App Bar)
 * Menu button + Tinokpedia wordmark + notification bell with unread badge.
 * Matches the dashboard prototype: sticky, white surface, soft shadow.
 */
export default function Header({ onNotificationsClick, onMenuClick, unreadCount = 0 }) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white soft-shadow">
      <div className="mx-auto flex h-16 max-w-[600px] items-center justify-between px-margin-mobile">
        {/* Left — notification bell */}
        <button
          type="button"
          onClick={onNotificationsClick}
          aria-label="התראות"
          className="relative flex items-center justify-center rounded-full p-2 text-primary transition-colors hover:bg-surface-container-low active:scale-95"
        >
          <span className="material-symbols-outlined text-[28px]">notifications_none</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Center — wordmark */}
        <h1 className="font-heebo text-headline-xl font-bold text-primary">
          Tinokpedia
        </h1>

        {/* Right — menu */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="תפריט"
          className="flex items-center justify-center rounded-full p-2 text-primary transition-colors hover:bg-surface-container-low active:scale-95"
        >
          <span className="material-symbols-outlined text-[28px]">menu</span>
        </button>
      </div>
    </header>
  )
}

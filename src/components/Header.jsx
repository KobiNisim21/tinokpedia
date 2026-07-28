/**
 * Header — סרגל עליון קבוע (Top App Bar)
 * Avatar + Tinokpedia wordmark + settings button.
 * Matches the dashboard prototype: sticky, white surface, soft shadow.
 */
export default function Header({ avatarSrc, onSettingsClick }) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white soft-shadow">
      <div className="mx-auto flex h-16 max-w-[600px] items-center justify-between px-margin-mobile">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-surface-container-high">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="תמונת פרופיל"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
            )}
          </div>
          <h1 className="font-heebo text-headline-xl font-bold text-primary">
            Tinokpedia
          </h1>
        </div>

        <button
          type="button"
          onClick={onSettingsClick}
          aria-label="הגדרות"
          className="flex items-center justify-center rounded-full p-2 text-on-surface-variant transition-colors transition-transform hover:bg-surface-container-low active:scale-95"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  )
}

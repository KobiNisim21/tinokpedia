import { useState, useEffect } from "react"

/**
 * PWAInstallBanner — באנר התקנת אפליקציה
 *
 * Shows a smart install prompt:
 * - Android/Chrome: intercepts `beforeinstallprompt` and triggers the native install dialog.
 * - iOS Safari: shows manual instructions (share → Add to Home Screen).
 * - Hides itself if the app is already installed (standalone) or the user dismissed it.
 * - Dismiss state is saved to localStorage so we don't nag.
 */
export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed
    if (localStorage.getItem("pwa_banner_dismissed") === "true") return

    // Don't show if already running as installed PWA
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      return
    }

    // Detect iOS Safari
    const ua = navigator.userAgent
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua)

    if (isiOS) {
      setIsIOS(true)
      setShowBanner(true)
      return
    }

    // Android / Chrome: listen for the native install prompt
    function handleBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
  }, [])

  function handleInstallClick() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then((result) => {
      setDeferredPrompt(null)
      if (result.outcome === "accepted") {
        handleDismiss()
      }
    })
  }

  function handleDismiss() {
    setShowBanner(false)
    localStorage.setItem("pwa_banner_dismissed", "true")
  }

  if (!showBanner) return null

  return (
    <div className="rounded-3xl bg-white p-5 soft-shadow animate-in">
      {/* Close button */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[28px]">
            install_mobile
          </span>
          <h3 className="font-heebo text-headline-xl text-slate-800">
            התקינו את האפליקציה
          </h3>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low"
          aria-label="סגירה"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {isIOS ? (
        /* iOS instructions */
        <div className="flex flex-col gap-3">
          <p className="font-assistant text-body-base text-slate-800 leading-relaxed">
            להוספה למסך הבית: לחצי על כפתור השיתוף{" "}
            <span className="inline-block translate-y-[1px] text-primary">⎋</span>{" "}
            בתחתית המסך ואז{" "}
            <strong className="text-primary">&#8220;הוסף למסך הבית&#8221; ➕</strong>
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-primary-container/30 px-3 py-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              info
            </span>
            <span className="font-assistant text-body-sm text-on-primary-container">
              זה יאפשר גישה מהירה ונוחה ישירות ממסך הבית שלך
            </span>
          </div>
        </div>
      ) : (
        /* Android / Chrome prompt */
        <div className="flex flex-col gap-3">
          <p className="font-assistant text-body-base text-slate-800 leading-relaxed">
            התקיני את תינוקפדיה במסך הבית לגישה מהירה ונוחה — גם ללא אינטרנט!
          </p>
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-heebo text-headline-xl text-on-primary transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">
              download
            </span>
            התקנה
          </button>
        </div>
      )}
    </div>
  )
}

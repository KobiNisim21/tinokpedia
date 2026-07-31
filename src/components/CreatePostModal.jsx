import { useState } from "react"

/**
 * CreatePostModal — Bottom sheet for creating a new community post.
 *
 * Props:
 *  - isOpen (boolean)
 *  - onClose (function)
 *  - onSubmit (function) — called with { content, isAnonymous }
 *  - loading (boolean) — disables submit while saving
 */
export default function CreatePostModal({ isOpen, onClose, onSubmit, loading }) {
  const [content, setContent] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)

  function handleSubmit() {
    if (!content.trim() || loading) return
    onSubmit({ content: content.trim(), isAnonymous })
    setContent("")
    setIsAnonymous(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-800/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative mx-auto flex w-full max-w-[600px] flex-col gap-4 rounded-t-3xl bg-white p-6 shadow-2xl animate-in">
        {/* Drag handle */}
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-surface-container-high" />

        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-headline-xl text-headline-xl text-primary">
            פוסט חדש
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Text area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[150px] w-full resize-none rounded-2xl border-none bg-surface-bright p-4 font-body-base text-body-base text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary-container"
          placeholder="על מה תרצי להתייעץ..."
          dir="rtl"
        />

        {/* Anonymous toggle */}
        <div className="flex items-center justify-between py-2">
          <span className="font-body-base text-body-base text-slate-600">
            פרסום אנונימי
          </span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-surface-container-high after:absolute after:right-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-surface-container-high after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:-translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
          </label>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() || loading}
          className="mt-2 w-full rounded-full bg-primary py-4 font-headline-xl text-headline-xl text-white transition-colors duration-200 hover:bg-on-primary-container active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "מפרסמת..." : "פרסום בקהילה"}
        </button>
      </div>
    </div>
  )
}

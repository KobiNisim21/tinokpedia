import { useState, useRef, useEffect } from "react"

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
 * PostCommentsModal — Bottom sheet for viewing and adding comments on a post.
 *
 * Props:
 *  - isOpen (boolean)
 *  - onClose (function)
 *  - post (object|null) — the post being commented on
 *  - onAddComment (function) — called with { postId, text, isAnonymous }
 *  - currentUserName (string) — for display
 */
export default function PostCommentsModal({
  isOpen,
  onClose,
  post,
  onAddComment,
  currentUserName: _currentUserName,
}) {
  const [text, setText] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const listRef = useRef(null)

  // Scroll to bottom when comments change
  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [isOpen, post?.comments?.length])

  if (!isOpen || !post) return null

  const comments = post.comments || []
  const postId = post._id || post.id

  function handleSubmit() {
    if (!text.trim()) return
    onAddComment({
      postId,
      text: text.trim(),
      isAnonymous,
    })
    setText("")
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-800/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative mx-auto flex w-full max-w-[600px] flex-col rounded-t-3xl bg-white shadow-2xl animate-in"
        style={{ maxHeight: "85vh" }}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-1 mt-3 h-1.5 w-12 rounded-full bg-surface-container-high" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-3 pt-2">
          <h3 className="font-headline-xl text-headline-xl text-primary">
            תגובות ({comments.length})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Original post preview */}
        <div className="mx-6 mb-3 rounded-2xl bg-surface-container-low p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-body-base text-body-base font-semibold text-slate-800">
              {post.authorName}
            </span>
            <span className="font-body-sm text-body-sm text-slate-500">
              {timeAgo(post.createdAt)}
            </span>
          </div>
          <p className="font-body-base text-body-sm leading-relaxed text-slate-800 line-clamp-3">
            {post.content}
          </p>
        </div>

        <div className="border-t border-surface-container" />

        {/* Comments list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-6 py-3"
          style={{ minHeight: "120px", maxHeight: "45vh" }}
        >
          {comments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="material-symbols-outlined text-primary text-[36px]">
                chat_bubble_outline
              </span>
              <p className="font-heebo text-headline-xl text-slate-800">
                עוד אין תגובות
              </p>
              <p className="font-assistant text-body-sm text-on-surface-variant">
                היי את הראשונה להגיב! 💬
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {comments.map((c, i) => (
                <div key={c.id || i} className="flex gap-3">
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                      c.isAnonymous
                        ? "bg-surface-container-high text-slate-500"
                        : "bg-secondary-container text-on-secondary-container"
                    }`}
                  >
                    {c.isAnonymous ? (
                      <span className="material-symbols-outlined text-[16px]">
                        person_outline
                      </span>
                    ) : (
                      (c.authorName || "?").slice(0, 1)
                    )}
                  </div>
                  {/* Comment body */}
                  <div className="flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="font-body-base text-body-sm font-semibold text-slate-800">
                        {c.authorName}
                      </span>
                      <span className="font-body-sm text-[12px] text-slate-400">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="font-assistant text-body-base leading-relaxed text-slate-800">
                      {c.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky bottom input */}
        <div className="border-t border-surface-container px-6 pb-6 pt-3">
          {/* Anonymous toggle */}
          <div className="mb-2 flex items-center justify-between">
            <span className="font-assistant text-body-sm text-slate-500">
              הגיבי אנונימית
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-surface-container-high after:absolute after:right-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-surface-container-high after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:-translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="כתבי תגובה..."
              className="flex-1 rounded-xl border-none bg-surface-container-low px-4 py-3 font-assistant text-body-base text-on-background outline-none placeholder:text-outline focus:ring-2 focus:ring-primary-container"
              dir="rtl"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="rounded-xl bg-primary px-5 py-3 font-heebo text-body-base text-on-primary transition-opacity hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              שלחי
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from "react"
import { useUser, useAuth } from "@clerk/clerk-react"
import Header from "./Header"
import BottomNav from "./BottomNav"
import CreatePostModal from "./CreatePostModal"
import { pregnancyStatus } from "../utils/pregnancy"

const CATEGORIES = ["הכל", "הטרימסטר שלי", "בדיקות וייעוץ", "חוויות ושיח"]

const AVATAR_COLORS = [
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-primary-container text-on-primary-container",
]

const TRIMESTER_NAMES = { 1: "ראשון", 2: "שני", 3: "שלישי" }

/** Return initials (up to 2 chars) from a Hebrew name. */
function getInitials(name) {
  if (!name) return "?"
  const parts = name.split(" ").filter(Boolean)
  if (parts.length >= 2) return parts[0][0] + parts[1][0]
  return parts[0].slice(0, 2)
}

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
  if (diffDay < 7) return `לפני ${diffDay} ימים`
  return `לפני ${Math.floor(diffDay / 7)} שבועות`
}

/**
 * CommunityScreen — קהילת האמהות
 *
 * Shows a post feed with filtering, like toggle, and post creation.
 */
export default function CommunityScreen({ onTabChange, edd }) {
  const { user } = useUser()
  const { getToken } = useAuth()

  const [posts, setPosts] = useState([])
  const [activeCategory, setActiveCategory] = useState("הכל")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [posting, setPosting] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(true)

  const status = edd ? pregnancyStatus(edd) : null

  const LS_KEY = "tinokpedia_community_posts"

  function loadLocalPosts() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function saveLocalPost(post) {
    try {
      const existing = loadLocalPosts()
      localStorage.setItem(LS_KEY, JSON.stringify([post, ...existing]))
    } catch { /* quota exceeded — ignore */ }
  }

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (activeCategory !== "הכל" && activeCategory !== "הטרימסטר שלי") {
        params.set("category", activeCategory)
      }
      if (activeCategory === "הטרימסטר שלי" && status) {
        params.set("trimester", status.trimester)
      }
      const res = await fetch(`/api/posts?${params.toString()}`)
      if (res.ok) {
        const apiPosts = await res.json()
        // Merge with any local-only posts (that haven't synced yet)
        const localPosts = loadLocalPosts()
        const apiIds = new Set(apiPosts.map((p) => p._id || p.id))
        const localOnly = localPosts.filter(
          (p) => !apiIds.has(p._id || p.id)
        )
        setPosts([...localOnly, ...apiPosts])
        setLoadingPosts(false)
        return
      }
    } catch {
      // API unreachable — use localStorage fallback
    }
    // Fallback: show local posts
    setPosts(loadLocalPosts())
    setLoadingPosts(false)
  }, [activeCategory, status])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Create post
  async function handleCreatePost({ content, isAnonymous }) {
    setPosting(true)

    const localPost = {
      _id: `local_${Date.now()}`,
      clerkId: user?.id,
      content,
      isAnonymous,
      authorName: isAnonymous
        ? "חברה אנונימית"
        : user?.fullName || user?.firstName || "משתמשת",
      week: status?.week ?? 0,
      trimester: status?.trimester ?? 1,
      category: "חוויות ושיח",
      likes: [],
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    }

    try {
      const token = await getToken()
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(localPost),
      })
      if (res.ok) {
        const savedPost = await res.json()
        setPosts((prev) => [savedPost, ...prev])
      } else {
        // API returned error — save locally and show anyway
        saveLocalPost(localPost)
        setPosts((prev) => [localPost, ...prev])
      }
    } catch {
      // Network error — save locally and show anyway
      saveLocalPost(localPost)
      setPosts((prev) => [localPost, ...prev])
    }

    // Switch to "הכל" so the user always sees their new post
    setActiveCategory("הכל")
    setPosting(false)
    setIsModalOpen(false)
  }

  // Toggle like
  async function handleLike(postId) {
    const clerkId = user?.id
    if (!clerkId) return

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if ((p._id || p.id) !== postId) return p
        const liked = p.likes?.includes(clerkId)
        return {
          ...p,
          likes: liked
            ? p.likes.filter((id) => id !== clerkId)
            : [...(p.likes || []), clerkId],
        }
      })
    )

    try {
      const token = await getToken()
      await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "like", postId }),
      })
    } catch {
      // revert on failure — refetch
      fetchPosts()
    }
  }

  const clerkId = user?.id

  return (
    <div className="flex min-h-screen flex-col md:items-center">
      <Header />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-stack-gap px-margin-mobile pt-20 pb-24 md:pb-6">
        {/* Header section */}
        <section className="mt-4 text-center">
          <h2 className="mb-2 font-headline-3xl-mobile text-headline-3xl-mobile text-primary">
            קהילת האמהות
          </h2>
          <p className="font-body-base text-body-base text-slate-500">
            מקום בטוח לשתף ולהתייעץ
          </p>
        </section>

        {/* Create post button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="group mt-2 flex w-full items-center justify-center gap-2 rounded-3xl bg-tertiary-container px-6 py-4 shadow-sm transition-all duration-200 hover:bg-tertiary-fixed active:scale-95"
        >
          <span className="font-headline-xl text-headline-xl text-slate-800">
            שאלה או חוויה חדשה ✍️
          </span>
        </button>

        {/* Category bar */}
        <div className="hide-scrollbar -mx-margin-mobile flex gap-3 overflow-x-auto px-margin-mobile py-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap rounded-full px-6 py-2 font-label-caps text-label-caps transition-all ${
                activeCategory === cat
                  ? "bg-primary-container text-on-primary-container"
                  : "border border-surface-container-highest bg-white text-slate-500 hover:bg-surface-container-lowest"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Post feed */}
        <div className="mt-2 flex flex-col gap-4">
          {loadingPosts ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
              <span className="font-assistant text-body-sm text-on-surface-variant">
                טוענת פוסטים...
              </span>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-card-padding text-center soft-shadow">
              <span className="material-symbols-outlined text-primary text-[40px]">
                forum
              </span>
              <p className="font-heebo text-headline-xl text-slate-800">
                עדיין אין פוסטים
              </p>
              <p className="font-assistant text-body-sm text-on-surface-variant">
                היי את הראשונה! שתפי שאלה או חוויה 💬
              </p>
            </div>
          ) : (
            posts.map((post, idx) => {
              const id = post._id || post.id
              const liked = post.likes?.includes(clerkId)
              const colorClass =
                AVATAR_COLORS[idx % AVATAR_COLORS.length]
              const trimName = TRIMESTER_NAMES[post.trimester] || "ראשון"

              return (
                <article
                  key={id}
                  className="flex flex-col gap-4 rounded-3xl bg-white p-card-padding shadow-[0_12px_12px_0_rgba(30,41,59,0.04)]"
                >
                  {/* Author row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {post.isAnonymous ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-slate-500">
                          <span className="material-symbols-outlined">
                            person_outline
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full font-headline-xl text-headline-xl ${colorClass}`}
                        >
                          {getInitials(post.authorName)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-body-base text-body-base font-semibold text-slate-800">
                          {post.authorName}
                        </h3>
                        <p className="font-body-sm text-body-sm text-slate-500">
                          {timeAgo(post.createdAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined">
                        more_vert
                      </span>
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary-container px-3 py-1 font-label-caps text-label-caps text-[10px] text-on-primary-container">
                      שבוע {post.week} • שליש {trimName}
                    </span>
                    {post.category && (
                      <span className="rounded-full bg-surface-container px-3 py-1 font-label-caps text-label-caps text-[10px] text-on-surface">
                        {post.category}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <p className="font-body-base text-body-base leading-relaxed text-slate-800">
                    {post.content}
                  </p>

                  {/* Footer */}
                  <div className="mt-2 flex items-center gap-6 border-t border-surface-container pt-4">
                    <button
                      type="button"
                      onClick={() => handleLike(id)}
                      className="flex items-center gap-1 text-slate-500 transition-colors hover:text-secondary"
                    >
                      <span
                        className={`material-symbols-outlined ${liked ? "text-secondary" : ""}`}
                        style={
                          liked
                            ? { fontVariationSettings: "'FILL' 1" }
                            : undefined
                        }
                      >
                        {liked ? "favorite" : "favorite_border"}
                      </span>
                      <span className="font-body-sm text-body-sm">
                        {post.likes?.length || 0}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-slate-500 transition-colors hover:text-primary"
                    >
                      <span className="material-symbols-outlined">
                        chat_bubble_outline
                      </span>
                      <span className="font-body-sm text-body-sm">
                        {post.commentsCount || 0} תגובות
                      </span>
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </main>

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePost}
        loading={posting}
      />

      <BottomNav active="community" onSelect={onTabChange} />
    </div>
  )
}

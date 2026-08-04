import { useState, useEffect, useCallback } from "react"
import { useUser, useAuth } from "@clerk/clerk-react"
import Header from "./Header"
import BottomNav from "./BottomNav"
import CreatePostModal from "./CreatePostModal"
import PostCommentsModal from "./PostCommentsModal"
import { pregnancyStatus } from "../utils/pregnancy"
import {
  ApiRequestError,
  apiRequest,
  discardPendingLocalPost,
  enqueueCommunityOperation,
  flushCommunityQueue,
  loadCachedPosts,
  saveCachedPosts,
} from "../services/communityQueue"

const CATEGORIES = ["הכל", "הטרימסטר שלי", "בדיקות וייעוץ", "חוויות ושיח", "כללי"]

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
export default function CommunityScreen({ onTabChange, edd, notificationProps = {} }) {
  const { user } = useUser()
  const { getToken } = useAuth()

  const [posts, setPosts] = useState([])
  const [activeCategory, setActiveCategory] = useState("הכל")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [posting, setPosting] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [commentsPost, setCommentsPost] = useState(null) // post object for comments modal
  const [editingPost, setEditingPost] = useState(null) // post object being edited
  const [activeMenuPostId, setActiveMenuPostId] = useState(null) // ID of post with open action menu

  const status = edd ? pregnancyStatus(edd) : null
  const currentTrimester = status?.trimester
  const userId = user?.id

  const loadLocalPosts = useCallback(
    () => loadCachedPosts(userId),
    [userId],
  )
  const saveAllPostsToLS = useCallback(
    (updatedPosts) => saveCachedPosts(userId, updatedPosts),
    [userId],
  )

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    // Build a client-side filter function (used for local posts too)
    function matchesFilter(p) {
      if (activeCategory === "הכל") return true
      if (activeCategory === "הטרימסטר שלי") return currentTrimester ? p.trimester === currentTrimester : true
      return p.category === activeCategory
    }

    try {
      const token = await getToken()
      if (!token || !userId) throw new Error("Missing session")
      if (navigator.onLine) {
        const { idMap, droppedLocalIds } = await flushCommunityQueue(userId, token)
        const removableIds = new Set([...Object.keys(idMap), ...droppedLocalIds])
        if (removableIds.size > 0) {
          saveCachedPosts(
            userId,
            loadLocalPosts().filter((post) => !removableIds.has(post._id || post.id)),
          )
        }
      }

      const params = new URLSearchParams()
      if (activeCategory !== "הכל" && activeCategory !== "הטרימסטר שלי") {
        params.set("category", activeCategory)
      }
      if (activeCategory === "הטרימסטר שלי" && currentTrimester) {
        params.set("trimester", currentTrimester)
      }
      const apiPosts = await apiRequest(token, `/api/posts?${params.toString()}`)
      const pendingPosts = loadLocalPosts().filter(
        (post) => post.pendingSync && matchesFilter(post),
      )
      const merged = [...pendingPosts, ...apiPosts]
      setPosts(merged)
      if (activeCategory === "הכל") {
        saveAllPostsToLS(merged)
      } else {
        const fetchedIds = new Set(apiPosts.map((post) => post._id || post.id))
        const preserved = loadLocalPosts().filter((post) => {
          const id = post._id || post.id
          return !fetchedIds.has(id) && (post.pendingSync || !matchesFilter(post))
        })
        saveAllPostsToLS([...apiPosts, ...preserved])
      }
      setLoadingPosts(false)
      return
    } catch {
      // API unreachable — use localStorage fallback
    }
    // Fallback: show local posts with filtering
    setPosts(loadLocalPosts().filter(matchesFilter))
    setLoadingPosts(false)
  }, [
    activeCategory,
    currentTrimester,
    getToken,
    loadLocalPosts,
    saveAllPostsToLS,
    userId,
  ])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    window.addEventListener("online", fetchPosts)
    return () => window.removeEventListener("online", fetchPosts)
  }, [fetchPosts])

  function updatePosts(updater) {
    setPosts((previous) => {
      const updated = typeof updater === "function" ? updater(previous) : updater
      saveAllPostsToLS(updated)
      return updated
    })
  }

  async function handleCreatePost({ content, isAnonymous, category }) {
    setPosting(true)
    if (editingPost) {
      const postId = editingPost._id || editingPost.id
      const previousPosts = posts
      const payload = { postId, content, category }
      updatePosts((current) =>
        current.map((post) =>
          (post._id || post.id) === postId
            ? { ...post, content, category, pendingSync: true }
            : post,
        ),
      )
      setIsModalOpen(false)
      setEditingPost(null)

      if (String(postId).startsWith("local_")) {
        enqueueCommunityOperation(userId, { type: "edit", payload })
        setPosting(false)
        return
      }

      try {
        const token = await getToken()
        if (!token) throw new Error("Missing session")
        const savedPost = await apiRequest(token, "/api/posts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        updatePosts((current) =>
          current.map((post) => (post._id || post.id) === postId ? savedPost : post),
        )
      } catch (error) {
        if (error instanceof ApiRequestError && error.status < 500) {
          updatePosts(previousPosts)
          alert("לא ניתן לשמור את עריכת הפוסט")
        } else {
          enqueueCommunityOperation(userId, { type: "edit", payload })
        }
      } finally {
        setPosting(false)
      }
      return
    }

    const payload = {
      content,
      isAnonymous,
      week: status?.week ?? 0,
      trimester: currentTrimester ?? 1,
      category: category || "חוויות ושיח",
    }
    const localId = "local_" + Date.now()
    const localPost = {
      _id: localId,
      ...payload,
      authorName: isAnonymous
        ? "חברה אנונימית"
        : user?.fullName || user?.firstName || "משתמשת",
      likesCount: 0,
      likedByCurrentUser: false,
      comments: [],
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      isOwner: true,
      pendingSync: true,
    }

    updatePosts((current) => [localPost, ...current])
    setActiveCategory("הכל")
    setIsModalOpen(false)

    try {
      const token = await getToken()
      if (!token) throw new Error("Missing session")
      const savedPost = await apiRequest(token, "/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      updatePosts((current) =>
        current.map((post) => (post._id || post.id) === localId ? savedPost : post),
      )
    } catch (error) {
      if (error instanceof ApiRequestError && error.status < 500) {
        updatePosts((current) =>
          current.filter((post) => (post._id || post.id) !== localId),
        )
        alert("לא ניתן לפרסם את הפוסט")
      } else {
        enqueueCommunityOperation(userId, {
          type: "create",
          localId,
          payload,
        })
      }
    } finally {
      setPosting(false)
    }
  }

  // Post Actions
  function handleEditStart(post) {
    setEditingPost(post)
    setIsModalOpen(true)
    setActiveMenuPostId(null)
  }

  async function handleDelete(postId) {
    if (!window.confirm("האם למחוק פוסט זה?")) return
    setActiveMenuPostId(null)
    const previousPosts = posts
    updatePosts((current) =>
      current.filter((post) => (post._id || post.id) !== postId),
    )

    if (String(postId).startsWith("local_")) {
      discardPendingLocalPost(userId, postId)
      return
    }

    try {
      const token = await getToken()
      if (!token) throw new Error("Missing session")
      await apiRequest(token, "/api/posts?id=" + encodeURIComponent(postId), {
        method: "DELETE",
      })
    } catch (error) {
      if (error instanceof ApiRequestError && error.status < 500) {
        updatePosts(previousPosts)
        alert("לא ניתן למחוק את הפוסט")
      } else {
        enqueueCommunityOperation(userId, {
          type: "delete",
          payload: { postId },
        })
      }
    }
  }

  function handleReport(_postId) {
    setActiveMenuPostId(null)
    alert("הדיווח התקבל ויבדק בהקדם")
  }

  async function handleLike(postId) {
    const previousPosts = posts
    updatePosts((current) =>
      current.map((post) => {
        if ((post._id || post.id) !== postId) return post
        const liked = !post.likedByCurrentUser
        return {
          ...post,
          likedByCurrentUser: liked,
          likesCount: Math.max(0, (post.likesCount || 0) + (liked ? 1 : -1)),
        }
      }),
    )

    const payload = { action: "like", postId }
    if (String(postId).startsWith("local_")) {
      enqueueCommunityOperation(userId, { type: "like", payload })
      return
    }

    try {
      const token = await getToken()
      if (!token) throw new Error("Missing session")
      const result = await apiRequest(token, "/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      updatePosts((current) =>
        current.map((post) =>
          (post._id || post.id) === postId
            ? { ...post, ...result }
            : post,
        ),
      )
    } catch (error) {
      if (error instanceof ApiRequestError && error.status < 500) {
        updatePosts(previousPosts)
      } else {
        enqueueCommunityOperation(userId, { type: "like", payload })
      }
    }
  }

  async function handleAddComment({ postId, text, isAnonymous }) {
    const previousPosts = posts
    const previousCommentsPost = commentsPost
    const newComment = {
      id: "c_" + Date.now(),
      authorName: isAnonymous
        ? "חברה אנונימית"
        : user?.fullName || user?.firstName || "משתמשת",
      isAnonymous,
      text,
      createdAt: new Date().toISOString(),
    }
    const addComment = (post) => ({
      ...post,
      comments: [...(post.comments || []), newComment],
      commentsCount: (post.commentsCount || 0) + 1,
    })

    updatePosts((current) =>
      current.map((post) =>
        (post._id || post.id) === postId ? addComment(post) : post,
      ),
    )
    setCommentsPost((current) =>
      current && (current._id || current.id) === postId
        ? addComment(current)
        : current,
    )

    const payload = {
      action: "comment",
      postId,
      comment: { id: newComment.id, text, isAnonymous },
    }
    if (String(postId).startsWith("local_")) {
      enqueueCommunityOperation(userId, { type: "comment", payload })
      return
    }

    try {
      const token = await getToken()
      if (!token) throw new Error("Missing session")
      const savedPost = await apiRequest(token, "/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      updatePosts((current) =>
        current.map((post) =>
          (post._id || post.id) === postId ? savedPost : post,
        ),
      )
      setCommentsPost((current) =>
        current && (current._id || current.id) === postId ? savedPost : current,
      )
    } catch (error) {
      if (error instanceof ApiRequestError && error.status < 500) {
        updatePosts(previousPosts)
        setCommentsPost(previousCommentsPost)
      } else {
        enqueueCommunityOperation(userId, { type: "comment", payload })
      }
    }
  }

  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startY, setStartY] = useState(0)
  const [isPulling, setIsPulling] = useState(false)

  const handleTouchStart = (e) => {
    if (window.scrollY <= 10) { // Allow slight tolerance
      setStartY(e.touches[0].clientY)
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return
    const currentY = e.touches[0].clientY
    const diff = currentY - startY
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.4, 80)) // resistance, cap at 80
    } else {
      setPullDistance(0)
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling) return
    setIsPulling(false)
    if (pullDistance > 65 && !isRefreshing) {
      setIsRefreshing(true)
      await fetchPosts()
      setIsRefreshing(false)
    }
    setPullDistance(0)
  }

  return (
    <div className="flex min-h-screen flex-col md:items-center">
      <Header {...notificationProps} />

      <main 
        className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-stack-gap px-margin-mobile pt-4 pb-24 md:pb-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh Indicator */}
        <div 
          className="flex w-full items-end justify-center overflow-hidden transition-all duration-200 ease-out"
          style={{ height: isRefreshing ? 60 : isPulling ? pullDistance : 0 }}
        >
          <div 
            className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
            style={{ 
              transform: `rotate(${isRefreshing ? 0 : pullDistance * 5}deg) scale(${Math.max(0, Math.min(pullDistance / 65, 1))})`,
              opacity: Math.min(pullDistance / 30, 1)
            }}
          >
            <span className={`material-symbols-outlined text-primary ${isRefreshing ? "animate-spin" : ""}`}>
              refresh
            </span>
          </div>
        </div>

        {/* Header section (reduced top spacing) */}
        <section className="mt-1 text-center">
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
              const liked = Boolean(post.likedByCurrentUser)
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
                    <div className="relative">
                      <button
                        type="button"
                        className="p-2 text-slate-400 transition-colors hover:text-slate-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveMenuPostId(activeMenuPostId === (post._id || post.id) ? null : (post._id || post.id))
                        }}
                      >
                        <span className="material-symbols-outlined">
                          more_vert
                        </span>
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuPostId === (post._id || post.id) && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={(e) => { e.stopPropagation(); setActiveMenuPostId(null); }}
                          />
                          <div className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-2xl bg-white py-1 shadow-lg ring-1 ring-black/5">
                            {post.isOwner ? (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEditStart(post); }}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-right font-body-base text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100"
                                >
                                  <span className="material-symbols-outlined text-xl">edit</span>
                                  עריכת פוסט
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(post._id || post.id); }}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-right font-body-base text-error transition-colors hover:bg-error/10 active:bg-error/20"
                                >
                                  <span className="material-symbols-outlined text-xl">delete</span>
                                  מחיקת פוסט
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReport(post._id || post.id); }}
                                className="flex w-full items-center gap-3 px-4 py-3 text-right font-body-base text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100"
                              >
                                <span className="material-symbols-outlined text-xl">flag</span>
                                דיווח על פוסט
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
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
                      className="flex items-center gap-1 transition-colors hover:text-secondary"
                    >
                      <span
                        className={`material-symbols-outlined ${liked ? "text-red-400" : "text-slate-500"}`}
                        style={
                          liked
                            ? { fontVariationSettings: "'FILL' 1" }
                            : undefined
                        }
                      >
                        {liked ? "favorite" : "favorite_border"}
                      </span>
                      <span className={`font-body-sm text-body-sm ${liked ? "text-red-400" : "text-slate-500"}`}>
                        {post.likesCount || 0}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentsPost(post)}
                      className="flex items-center gap-1 text-slate-500 transition-colors hover:text-primary"
                    >
                      <span className="material-symbols-outlined">
                        chat_bubble_outline
                      </span>
                      <span className="font-body-sm text-body-sm">
                        {post.commentsCount || post.comments?.length || 0} תגובות
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
        onClose={() => {
          setIsModalOpen(false)
          setEditingPost(null)
        }}
        onSubmit={handleCreatePost}
        loading={posting}
        initialPost={editingPost}
      />

      <PostCommentsModal
        isOpen={!!commentsPost}
        onClose={() => setCommentsPost(null)}
        post={commentsPost}
        onAddComment={handleAddComment}
        currentUserName={user?.fullName || user?.firstName || "משתמשת"}
      />

      <BottomNav active="community" onSelect={onTabChange} />
    </div>
  )
}

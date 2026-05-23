import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { categoriesApi, Category, Post } from '../api/categories'
import { ApiError } from '../api/client'
import { getCached, setCache } from '../api/cache'
import { useI18n } from '../context/Preferences'

export default function CategoryPage() {
  const t = useI18n()
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [category, setCategory] = useState<Category | null>(() => getCached<Category>(`category_${slug}`))
  const [posts, setPosts] = useState<Post[]>(() => getCached<Post[]>(`category_posts_${slug}`) || [])
  const [loading, setLoading] = useState(() => !getCached(`category_${slug}`))
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchCategoryPosts = async () => {
      if (!slug) return

      try {
        const data = await categoriesApi.getPosts(slug)
        setCategory(data.category)
        setPosts(data.posts)
        setCache(`category_${slug}`, data.category)
        setCache(`category_posts_${slug}`, data.posts)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setError(t.categoryPage.loadError)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCategoryPosts()
  }, [slug])

  if (notFound) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="text-6xl font-bold text-stone-300 dark:text-stone-600 mb-4">404</div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-4">{t.categoryPage.notFound}</h1>
          <p className="text-stone-600 dark:text-stone-400 mb-8">
            {t.categoryPage.notFoundDesc(slug || '')}
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/categories"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {t.categoryPage.backToCategories}
            </Link>
            <Link
              to="/"
              className="px-6 py-2 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              {t.post.returnHome}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => navigate('/categories')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {t.categoryPage.backToCategories}
        </button>
      </div>
    )
  }

  return (
    <article className="w-full max-w-3xl mx-auto">
      <header className="mb-8">
        <Link
          to="/categories"
          className="inline-flex items-center text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.categoryPage.backToCategories}
        </Link>

        {/* 标题骨架屏：loading 时显示占位，有数据时显示真实内容 */}
        {loading ? (
          <div className="animate-pulse">
            <div className="h-10 bg-stone-200 dark:bg-stone-700 rounded w-1/3 mb-3" />
            <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/5" />
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-2">
              {category?.name}
            </h1>
            {category?.description && (
              <p className="text-stone-600 dark:text-stone-400 mb-4">{category.description}</p>
            )}
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {t.categoryPage.postCount(posts.length)}
            </p>
          </div>
        )}
      </header>

      {/* 文章列表：loading 时显示骨架，有数据时显示内容 */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-stone-200 dark:border-stone-700 rounded-lg p-4">
              <div className="h-6 bg-stone-200 dark:bg-stone-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-full mb-1" />
              <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-stone-400 dark:text-stone-500 mb-4">{t.categoryPage.noPosts}</div>
          <Link
            to="/categories"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t.categoryPage.browseOtherCategories}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, index) => (
            <div
              key={post.id}
              className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 stagger-item"
              style={{ '--stagger-index': index } as React.CSSProperties}
            >
              <Link to={`/post/${post.id}`} className="block">
                <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 hover:text-indigo-600 dark:hover:text-indigo-400 mb-2">
                  {post.title}
                </h2>
              </Link>
              <p className="text-stone-600 dark:text-stone-300 text-sm mb-2 line-clamp-2">
                {post.content.substring(0, 150)}...
              </p>
              <div className="text-xs text-stone-400 dark:text-stone-500">
                {new Date(post.created_at).toLocaleDateString('zh-CN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

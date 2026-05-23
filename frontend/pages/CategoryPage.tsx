import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { categoriesApi, Category, Post } from '../api/categories'
import { ApiError } from '../api/client'

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [category, setCategory] = useState<Category | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchCategoryPosts = async () => {
      if (!slug) return

      try {
        const data = await categoriesApi.getPosts(slug)
        setCategory(data.category)
        setPosts(data.posts)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setError('加载分类文章失败')
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
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-4">分类不存在</h1>
          <p className="text-stone-600 dark:text-stone-400 mb-8">
            您访问的分类 "{slug}" 不存在或已被删除。
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/categories"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              返回分类列表
            </Link>
            <Link
              to="/"
              className="px-6 py-2 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-stone-200 dark:bg-stone-700 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-stone-200 dark:bg-stone-700 rounded"></div>
          ))}
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
          返回分类列表
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
          返回分类列表
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-2">
          {category?.name}
        </h1>
        {category?.description && (
          <p className="text-stone-600 dark:text-stone-400 mb-4">{category.description}</p>
        )}
        <p className="text-sm text-stone-500 dark:text-stone-400">
          共 {posts.length} 篇文章
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-stone-400 dark:text-stone-500 mb-4">该分类暂无文章</div>
          <Link
            to="/categories"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            浏览其他分类
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 hover:shadow-md transition-shadow"
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

import { useEffect, useMemo, useState } from 'react'
import { Search, Bell, BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState, UpgradePrompt } from '@/components/ui'
import { ArticleCard, ArticleDetail } from '@/components/ArticleViews'
import { listArticles, listCategories, searchArticles } from '@/services/knowledge'
import { subscribePublishedArticles } from '@/services/notifications'
import { useAuth } from '@/contexts/AuthContext'
import type { KnowledgeArticle, KnowledgeCategory } from '@/types'

const FREE_VIEW_LIMIT = 5

export default function KnowledgePage() {
  const [cats, setCats] = useState<KnowledgeCategory[]>([])
  const [articles, setArticles] = useState<KnowledgeArticle[] | null>(null)
  const [activeCat, setActiveCat] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null)
  const [newInfo, setNewInfo] = useState(false)

  const load = () =>
    listArticles({ status: 'published' })
      .then(setArticles)
      .catch(() => setArticles([]))

  useEffect(() => {
    listCategories().then(setCats).catch(() => {})
    load()
    const unsub = subscribePublishedArticles(() => setNewInfo(true))
    return unsub
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) searchArticles(query).then(setArticles).catch(() => {})
      else load()
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const filtered = useMemo(() => {
    if (!articles) return null
    if (activeCat === 'all') return articles
    return articles.filter((a) => a.category_id === activeCat)
  }, [articles, activeCat])

  const { planState } = useAuth()
  const unlimited = planState?.plan?.code === 'unlimited'
  const visible = filtered && !unlimited ? filtered.slice(0, FREE_VIEW_LIMIT) : filtered
  const capped = !!filtered && !unlimited && filtered.length > FREE_VIEW_LIMIT

  return (
    <div>
      <PageHeader title="DG Knowledge" subtitle="Fundamentals, systems and verified technical articles." />

      {newInfo && (
        <button
          onClick={() => {
            setNewInfo(false)
            load()
          }}
          className="mb-4 flex w-full items-center gap-2 rounded-lg border border-brand-500/40 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
        >
          <Bell className="h-4 w-4" /> New technical information available — click to refresh.
        </button>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-steel-400" />
        <input
          className="input pl-10"
          placeholder="Search: 'Cummins overheating', 'low oil pressure', 'DG not starting'…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Category chips */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <Chip active={activeCat === 'all'} onClick={() => setActiveCat('all')}>All</Chip>
        {cats.map((c) => (
          <Chip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>

      {filtered === null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {filtered?.length === 0 && (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="No articles found"
          description="Try a different search or category. Admins can publish new articles from the admin dashboard."
        />
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible!.map((a) => (
            <ArticleCard key={a.id} article={a} onOpen={setSelected} />
          ))}
        </div>
      )}

      {capped && <UpgradePrompt message={`Free plan shows ${FREE_VIEW_LIMIT} articles. Upgrade to see all ${filtered!.length}.`} />}

      {selected && <ArticleDetail article={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-brand-600 text-white'
          : 'bg-steel-100 text-steel-600 hover:bg-steel-200 dark:bg-steel-800 dark:text-steel-300'
      }`}
    >
      {children}
    </button>
  )
}

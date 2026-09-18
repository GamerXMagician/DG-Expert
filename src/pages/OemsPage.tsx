import { useEffect, useState } from 'react'
import { Factory, ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState, UpgradePrompt } from '@/components/ui'
import { ArticleCard, ArticleDetail } from '@/components/ArticleViews'
import { listOems, listArticles, listModels } from '@/services/knowledge'
import { useAuth } from '@/contexts/AuthContext'
import type { Oem, KnowledgeArticle, GeneratorModel } from '@/types'

const FREE_VIEW_LIMIT = 5

export default function OemsPage() {
  const [oems, setOems] = useState<Oem[] | null>(null)
  const [active, setActive] = useState<Oem | null>(null)
  const { planState } = useAuth()
  const unlimited = planState?.plan?.code === 'unlimited'

  useEffect(() => {
    listOems().then(setOems).catch(() => setOems([]))
  }, [])

  if (active) return <OemDetail oem={active} onBack={() => setActive(null)} />

  const visible = oems && !unlimited ? oems.slice(0, FREE_VIEW_LIMIT) : oems
  const capped = !!oems && !unlimited && oems.length > FREE_VIEW_LIMIT

  return (
    <div>
      <PageHeader title="OEMs / Brands" subtitle="OEM-specific knowledge. Procedures vary by manufacturer." />
      {oems === null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      )}
      {oems?.length === 0 && (
        <EmptyState icon={<Factory className="h-10 w-10" />} title="No OEMs yet" description="Admins can add OEMs from the admin dashboard." />
      )}
      {oems && oems.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible!.map((o) => (
            <button key={o.id} onClick={() => setActive(o)} className="card p-5 text-left transition-transform hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand-600/10 text-brand-600 font-bold">
                  {o.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{o.name}</h3>
                  {o.country && <p className="text-xs text-steel-400">{o.country}</p>}
                </div>
              </div>
              {o.overview && <p className="mt-3 line-clamp-2 text-sm text-steel-500">{o.overview}</p>}
            </button>
          ))}
        </div>
      )}
      {capped && <UpgradePrompt message={`Free plan shows ${FREE_VIEW_LIMIT} OEMs. Upgrade to see all ${oems!.length}.`} />}
    </div>
  )
}

function OemDetail({ oem, onBack }: { oem: Oem; onBack: () => void }) {
  const [articles, setArticles] = useState<KnowledgeArticle[] | null>(null)
  const [models, setModels] = useState<GeneratorModel[]>([])
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null)

  useEffect(() => {
    listArticles({ oemId: oem.id, status: 'published' }).then(setArticles).catch(() => setArticles([]))
    listModels(oem.id).then(setModels).catch(() => {})
  }, [oem.id])

  return (
    <div>
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft className="h-4 w-4" /> All OEMs</button>
      <PageHeader title={oem.name} subtitle={oem.country ?? undefined} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold">Overview</h3>
          <p className="mt-1 text-sm text-steel-500">{oem.overview ?? 'No overview provided.'}</p>
          {oem.engine_families && (
            <>
              <h3 className="mt-4 font-semibold">Engine families</h3>
              <p className="mt-1 text-sm text-steel-500">{oem.engine_families}</p>
            </>
          )}
        </div>
        <div className="card p-5">
          <h3 className="font-semibold">Generator models</h3>
          {models.length === 0 ? (
            <p className="mt-1 text-sm text-steel-400">No models listed yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {models.map((m) => (
                <li key={m.id} className="flex justify-between">
                  <span>{m.name}</span>
                  {m.power_rating && <span className="text-steel-400">{m.power_rating}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-steel-400">
        {oem.name} knowledge &amp; common faults
      </h3>
      {articles === null && <Skeleton className="h-24" />}
      {articles?.length === 0 && (
        <EmptyState title="No OEM-specific articles yet" description={`Admins can publish ${oem.name}-specific troubleshooting and maintenance articles.`} />
      )}
      {articles && articles.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => <ArticleCard key={a.id} article={a} onOpen={setSelected} />)}
        </div>
      )}
      {selected && <ArticleDetail article={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

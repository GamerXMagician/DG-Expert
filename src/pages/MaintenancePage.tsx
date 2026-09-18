import { useEffect, useState } from 'react'
import { Wrench } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState, SafetyNote } from '@/components/ui'
import { ArticleCard, ArticleDetail } from '@/components/ArticleViews'
import { listArticles, listCategories } from '@/services/knowledge'
import type { KnowledgeArticle } from '@/types'

export default function MaintenancePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[] | null>(null)
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const cats = await listCategories()
        const maint = cats.find((c) => c.slug === 'maintenance')
        const arts = await listArticles({
          status: 'published',
          categoryId: maint?.id,
        })
        setArticles(arts)
      } catch {
        setArticles([])
      }
    })()
  }, [])

  return (
    <div>
      <PageHeader title="Maintenance Guides" subtitle="Preventive and scheduled maintenance guidance." />

      <div className="mb-6">
        <SafetyNote>
          Maintenance intervals below are general guidance. Always follow the manufacturer&apos;s
          official maintenance schedule for your specific generator model and operating environment.
        </SafetyNote>
      </div>

      {articles === null && <Skeleton className="h-24" />}
      {articles?.length === 0 && (
        <EmptyState icon={<Wrench className="h-10 w-10" />} title="No maintenance guides yet" description="Admins can publish maintenance guides from the admin dashboard." />
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

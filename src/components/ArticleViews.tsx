import { X } from 'lucide-react'
import { SafetyNote } from '@/components/ui'
import type { KnowledgeArticle } from '@/types'

export function ArticleCard({
  article,
  onOpen,
}: {
  article: KnowledgeArticle
  onOpen: (a: KnowledgeArticle) => void
}) {
  return (
    <button
      onClick={() => onOpen(article)}
      className="card p-5 text-left transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-2">
        {article.system && (
          <span className="badge bg-steel-100 text-steel-600 dark:bg-steel-800 dark:text-steel-300">
            {article.system}
          </span>
        )}
        {article.is_demo && (
          <span className="badge bg-safety-500/15 text-safety-600">Demo</span>
        )}
      </div>
      <h3 className="mt-2 font-semibold">{article.title}</h3>
      {article.problem && <p className="mt-1 line-clamp-2 text-sm text-steel-500">{article.problem}</p>}
    </button>
  )
}

function Section({ title, text }: { title: string; text?: string | null }) {
  if (!text) return null
  return (
    <div>
      <h4 className="text-sm font-bold text-brand-700 dark:text-brand-300">{title}</h4>
      <p className="mt-1 whitespace-pre-line text-sm text-steel-600 dark:text-steel-300">{text}</p>
    </div>
  )
}

export function ArticleDetail({
  article,
  onClose,
}: {
  article: KnowledgeArticle
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {article.system && (
                <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {article.system}
                </span>
              )}
              {article.is_demo && <span className="badge bg-safety-500/15 text-safety-600">Demo content</span>}
            </div>
            <h2 className="mt-2 text-xl font-bold">{article.title}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost !p-2"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <Section title="Overview" text={article.body} />
          <Section title="Problem" text={article.problem} />
          <Section title="Symptoms" text={article.symptoms} />
          <Section title="Possible Causes" text={article.possible_causes} />
          <Section title="Diagnostic Procedure" text={article.diagnostic_procedure} />
          <Section title="Corrective Action" text={article.corrective_action} />
          {article.safety_precautions && (
            <SafetyNote>
              <span className="font-semibold">Safety: </span>
              {article.safety_precautions}
            </SafetyNote>
          )}
          <Section title="References" text={article.references_text} />
        </div>
      </div>
    </div>
  )
}

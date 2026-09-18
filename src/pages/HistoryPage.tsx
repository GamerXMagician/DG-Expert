import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Trash2, RotateCw, Bookmark, ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState, SimpleMarkdown } from '@/components/ui'
import { listMyQuestions, deleteQuestion, bookmarkQuestion } from '@/services/questions'
import { useAuth } from '@/contexts/AuthContext'
import type { Question } from '@/types'

export default function HistoryPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<Question[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    listMyQuestions(100).then(setItems).catch(() => setItems([]))
  }, [])

  const remove = async (id: string) => {
    await deleteQuestion(id).catch(() => {})
    setItems((prev) => prev?.filter((q) => q.id !== id) ?? null)
  }

  const save = async (id: string) => {
    if (session?.user) await bookmarkQuestion(session.user.id, id).catch(() => {})
  }

  return (
    <div>
      <PageHeader title="My Questions" subtitle="Your DG Expert question history." />

      {items === null && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      )}
      {items?.length === 0 && (
        <EmptyState icon={<History className="h-10 w-10" />} title="No questions yet" description="Ask DG Expert something to build your history." />
      )}
      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((q) => (
            <div key={q.id} className="card overflow-hidden">
              <button
                onClick={() => setOpen(open === q.id ? null : q.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="line-clamp-1 font-medium">{q.question}</p>
                  <p className="text-xs text-steel-400">{new Date(q.created_at).toLocaleString()}</p>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-steel-400 transition-transform ${open === q.id ? 'rotate-180' : ''}`} />
              </button>
              {open === q.id && (
                <div className="border-t border-steel-100 p-4 dark:border-steel-800">
                  {q.answer ? <SimpleMarkdown text={q.answer} /> : <p className="text-sm text-steel-400">No stored answer.</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => navigate('/assistant')} className="btn-secondary !py-1.5 text-xs">
                      <RotateCw className="h-3.5 w-3.5" /> Ask again
                    </button>
                    <button onClick={() => save(q.id)} className="btn-secondary !py-1.5 text-xs">
                      <Bookmark className="h-3.5 w-3.5" /> Save
                    </button>
                    <button onClick={() => remove(q.id)} className="btn-ghost !py-1.5 text-xs text-red-600">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

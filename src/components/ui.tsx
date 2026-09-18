import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Logo links to the home page by default. Pass linkTo={null} where it is already
// wrapped in a <Link> (avoids invalid nested anchors), or linkTo="/somewhere".
export function Logo({ className = '', linkTo = '/' }: { className?: string; linkTo?: string | null }) {
  const inner = (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <img src="/favicon.png" alt="DG Expert" className="h-8 w-8 rounded-lg object-cover" />
      <span>
        DG<span className="text-brand-600"> Expert</span>
      </span>
    </span>
  )
  if (linkTo === null) return inner
  return (
    <Link to={linkTo} aria-label="DG Expert home" className="shrink-0">
      {inner}
    </Link>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner className="h-8 w-8 text-brand-600" />
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-steel-200 dark:bg-steel-800 ${className}`} />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      {icon && <div className="text-steel-400">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-md text-sm text-steel-500">{description}</p>}
      {action}
    </div>
  )
}

export function SafetyNote({ children }: { children: ReactNode }) {
  return (
    <div className="safety-note flex gap-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-safety-500" />
      <div>{children}</div>
    </div>
  )
}

// Shown when a Free user hits a view/usage cap.
export function UpgradePrompt({ message }: { message: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-500/40 bg-brand-50 px-4 py-3 text-sm dark:bg-brand-950/40">
      <span className="text-brand-700 dark:text-brand-300">{message}</span>
      <a href="/pricing" className="btn-primary !py-1.5 text-xs">Upgrade to Unlimited</a>
    </div>
  )
}

// Minimal, dependency-free markdown renderer for AI answers:
// supports ## headings, - / 1. lists, **bold**, and paragraphs.
export function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let list: string[] = []
  let key = 0

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={key++} className="my-2 list-disc space-y-1 pl-5 text-sm">
          {list.map((l, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />
          ))}
        </ul>,
      )
      list = []
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^##\s+/.test(line)) {
      flushList()
      blocks.push(
        <h3 key={key++} className="mt-4 text-base font-bold text-brand-700 dark:text-brand-300">
          {line.replace(/^##\s+/, '')}
        </h3>,
      )
    } else if (/^\d+\.\s+/.test(line) || /^[-*]\s+/.test(line)) {
      list.push(line.replace(/^(\d+\.|[-*])\s+/, ''))
    } else if (line === '') {
      flushList()
    } else {
      flushList()
      blocks.push(
        <p key={key++} className="my-2 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(line) }} />,
      )
    }
  }
  flushList()
  return <div>{blocks}</div>
}

function inline(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

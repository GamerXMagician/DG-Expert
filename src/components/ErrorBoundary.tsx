import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

// Catches render/runtime errors in the tree below it so a thrown error shows a
// readable message instead of a blank white screen. Also logs to the console.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[DG Expert] Render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg p-8">
          <div className="rounded-xl border border-red-300 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
            <h1 className="text-lg font-bold text-red-700 dark:text-red-300">Something went wrong</h1>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              The page hit an error while rendering. Details:
            </p>
            <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-red-800 dark:bg-steel-900 dark:text-red-200">
              {this.state.error.message}
              {this.state.error.stack ? '\n\n' + this.state.error.stack : ''}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              className="btn-primary mt-4"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

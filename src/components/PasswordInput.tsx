import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Password field with a show/hide toggle. Drop-in for the `.input` styled field.
export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  required = true,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        className="input pr-11"
        type={show ? 'text' : 'password'}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-steel-400 hover:text-steel-600 dark:hover:text-steel-200"
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  )
}

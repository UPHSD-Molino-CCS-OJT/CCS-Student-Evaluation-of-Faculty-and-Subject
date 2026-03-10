import React, { useRef, useCallback } from 'react'

// Format: 00-0000-000  → groups of [2, 4, 3]
const GROUPS = [2, 4, 3]
const TOTAL = GROUPS.reduce((a, b) => a + b, 0) // 9

interface StudentIdInputProps {
  value: string          // formatted value e.g. "23-0142-001"
  onChange: (formatted: string) => void
  disabled?: boolean
  hasError?: boolean
}

/** Strips all non-digit characters from a string */
const digitsOnly = (s: string) => s.replace(/\D/g, '')

/** Converts a 9-digit string to formatted "DD-DDDD-DDD" */
const format = (digits: string): string => {
  const d = digits.slice(0, TOTAL)
  const g0 = d.slice(0, 2)
  const g1 = d.slice(2, 6)
  const g2 = d.slice(6, 9)
  return [g0, g1, g2].filter(Boolean).join('-')
}

/** Returns the flat digit index (0-8) of a given group+position */
const flatIndex = (group: number, pos: number): number => {
  return GROUPS.slice(0, group).reduce((a, b) => a + b, 0) + pos
}

const StudentIdInput: React.FC<StudentIdInputProps> = ({ value, onChange, disabled, hasError }) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Current digits extracted from the formatted value
  const digits = digitsOnly(value).padEnd(TOTAL, '').slice(0, TOTAL)

  const focusAt = (idx: number) => {
    const el = inputsRef.current[Math.max(0, Math.min(TOTAL - 1, idx))]
    el?.focus()
    // Move cursor to end of single char
    requestAnimationFrame(() => el?.setSelectionRange(1, 1))
  }

  const handleKeyDown = useCallback(
    (flatIdx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault()
        const arr = digits.split('')
        if (arr[flatIdx] && arr[flatIdx] !== ' ') {
          // Clear current cell
          arr[flatIdx] = ''
          onChange(format(arr.join('')))
        } else if (flatIdx > 0) {
          // Move back and clear previous
          arr[flatIdx - 1] = ''
          onChange(format(arr.join('')))
          focusAt(flatIdx - 1)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        focusAt(flatIdx - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        focusAt(flatIdx + 1)
      } else if (e.key === 'Delete') {
        e.preventDefault()
        const arr = digits.split('')
        arr[flatIdx] = ''
        onChange(format(arr.join('')))
      }
    },
    [digits, onChange]
  )

  const handleChange = useCallback(
    (flatIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = digitsOnly(e.target.value)
      if (!raw) return

      // Allow pasting multiple digits starting at current position
      const arr = digits.split('')
      let cursor = flatIdx
      for (const ch of raw) {
        if (cursor >= TOTAL) break
        arr[cursor] = ch
        cursor++
      }
      onChange(format(arr.join('')))
      // Focus the next empty or the last filled position
      focusAt(Math.min(cursor, TOTAL - 1))
    },
    [digits, onChange]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pasted = digitsOnly(e.clipboardData.getData('text'))
      onChange(format(pasted))
      focusAt(Math.min(pasted.length, TOTAL - 1))
    },
    [onChange]
  )

  // Responsive cell classes: compact on xs, larger on sm+
  const baseCell =
    'w-8 h-10 text-base sm:w-9 sm:h-12 sm:text-lg ' +
    'text-center font-mono border-2 rounded-lg focus:outline-none transition-colors'
  const normalCell = hasError
    ? `${baseCell} border-red-400 bg-red-50 focus:border-red-600`
    : `${baseCell} border-gray-300 focus:border-blue-500 bg-white`

  return (
    <div
      className="flex items-center justify-center gap-1 sm:gap-1.5 select-none w-full"
      aria-label="Student ID input"
    >
      {GROUPS.map((groupLen, groupIdx) => (
        <React.Fragment key={groupIdx}>
          {/* Cells for this group */}
          <div className="flex gap-1 sm:gap-1.5">
            {Array.from({ length: groupLen }).map((_, pos) => {
              const fi = flatIndex(groupIdx, pos)
              const digit = digits[fi] && digits[fi] !== ' ' ? digits[fi] : ''
              return (
                <input
                  key={fi}
                  ref={(el) => { inputsRef.current[fi] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={disabled}
                  aria-label={`Digit ${fi + 1}`}
                  className={`${normalCell} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
                  onChange={(e) => handleChange(fi, e)}
                  onKeyDown={(e) => handleKeyDown(fi, e)}
                  onPaste={handlePaste}
                  onFocus={(e) => e.target.select()}
                />
              )
            })}
          </div>
          {/* Dash separator between groups */}
          {groupIdx < GROUPS.length - 1 && (
            <span className="text-xl sm:text-2xl font-bold text-gray-400 mx-0.5 sm:mx-1 select-none">-</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default StudentIdInput

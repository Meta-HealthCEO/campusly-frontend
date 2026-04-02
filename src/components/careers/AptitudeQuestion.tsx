'use client'

import { Button } from '@/components/ui/button'

interface AptitudeQuestionProps {
  questionId: string
  text: string
  options: string[]
  value: number | null
  onChange: (questionId: string, value: number) => void
}

export function AptitudeQuestion({
  questionId,
  text,
  options,
  value,
  onChange,
}: AptitudeQuestionProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium leading-relaxed">{text}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option: string, index: number) => {
          const optionValue = index + 1
          const isSelected = value === optionValue

          return (
            <Button
              key={optionValue}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(questionId, optionValue)}
              type="button"
            >
              {option}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

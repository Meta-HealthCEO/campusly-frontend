'use client'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@/lib/utils'
import { FOCUS_RING } from './focus'

interface SliderProps {
  value: number[]
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number[]) => void
  className?: string
  disabled?: boolean
}

function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  className,
  disabled = false,
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={onValueChange}
      disabled={disabled}
      className={cn('flex w-full touch-none items-center select-none', className)}
    >
      <SliderPrimitive.Control className="relative flex h-5 w-full items-center">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Indicator className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className={cn('block size-5 rounded-full border-2 border-primary bg-card transition-colors duration-150 ease-standard disabled:pointer-events-none disabled:opacity-50', FOCUS_RING)} />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
export type { SliderProps }

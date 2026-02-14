'use client'

import { Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CounterInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  unit?: string
  className?: string
  compact?: boolean  // NEW: For compact horizontal layout
}

export function CounterInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  label,
  unit = '',
  className,
  compact = false,  // NEW
}: CounterInputProps) {
  const handleIncrement = () => {
    const newValue = parseFloat((value + step).toFixed(2))
    if (max === undefined || newValue <= max) {
      onChange(newValue)
    }
  }

  const handleDecrement = () => {
    const newValue = parseFloat((value - step).toFixed(2))
    if (newValue >= min) {
      onChange(newValue)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0
    if ((min === undefined || newValue >= min) && (max === undefined || newValue <= max)) {
      onChange(newValue)
    }
  }

  if (compact) {
    // Compact horizontal layout for use in cards
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center border-2 border-border transition-colors disabled:opacity-50"
        >
          <span className="text-lg font-bold">−</span>
        </button>
        
        <div className="relative flex-1">
          <input
            type="number"
            value={value}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            className="w-full px-2 py-2 rounded-lg bg-background text-center font-mono font-bold text-base border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              {unit}
            </span>
          )}
        </div>
        
        <button
          type="button"
          onClick={handleIncrement}
          disabled={max !== undefined && value >= max}
          className="w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center border-2 border-border transition-colors disabled:opacity-50"
        >
          <span className="text-lg font-bold">+</span>
        </button>
      </div>
    )
  }

  // Original vertical layout
  return (
    <div className={cn('flex flex-col items-center', className)}>
      {label && (
        <label className="text-xs font-mono text-muted-foreground mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={value <= min}
          className="neo-button rounded-full flex-shrink-0"
        >
          <Minus className="w-4 h-4" />
        </Button>
        
        <div className="relative">
          <Input
            type="number"
            value={value}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            className="neo-input w-20 text-center font-mono font-bold"
          />
          {unit && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              {unit}
            </span>
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          disabled={max !== undefined && value >= max}
          className="neo-button rounded-full flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
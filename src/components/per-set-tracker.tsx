'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Dumbbell, Target, CheckCircle, Circle, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { CounterInput } from './counter-input'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface SetData {
  set_number: number
  target_weight: number
  target_reps: number
  actual_weight: number
  actual_reps: number
  completed: boolean
}

interface PerSetTrackerProps {
  targetSets: number
  targetReps: number
  targetWeight: number
  setsData?: SetData[]
  onChange: (setsData: SetData[]) => void
}

export function PerSetTracker({
  targetSets,
  targetReps,
  targetWeight,
  setsData: externalSetsData,
  onChange,
}: PerSetTrackerProps) {
  // Initialize sets with default values
  const initialSets = useMemo(() => {
    if (externalSetsData && externalSetsData.length > 0) {
      return externalSetsData
    }
    return Array.from({ length: targetSets }, (_, i) => ({
      set_number: i + 1,
      target_weight: targetWeight,
      target_reps: targetReps,
      actual_weight: 0,
      actual_reps: 0,
      completed: false,
    }))
  }, [externalSetsData, targetSets, targetReps, targetWeight])

  const [setsData, setSetsData] = useState<SetData[]>(initialSets)

  // Sync with external changes
  useEffect(() => {
    if (externalSetsData && externalSetsData.length > 0) {
      setSetsData(externalSetsData)
    }
  }, [externalSetsData])

  // Notify parent of changes
  const notifyChange = useCallback((newData: SetData[]) => {
    onChange(newData)
  }, [onChange])

  // Update a specific set field
  const updateSet = (setNumber: number, field: keyof SetData, value: number | boolean) => {
    setSetsData(prev => {
      const updated = prev.map(set => {
        if (set.set_number === setNumber) {
          return { ...set, [field]: value }
        }
        return set
      })
      
      // Notify parent after state update
      setTimeout(() => notifyChange(updated), 0)
      return updated
    })
  }

  // Check if set meets target
  const meetsTarget = (set: SetData): { weight: boolean; reps: boolean } => {
    return {
      weight: set.actual_weight >= set.target_weight,
      reps: set.actual_reps >= set.target_reps,
    }
  }

  // Get performance indicator
  const getPerformanceIndicator = (set: SetData) => {
    const { weight, reps } = meetsTarget(set)
    
    if (set.actual_weight === 0 && set.actual_reps === 0) {
      return { icon: Minus, color: 'text-muted-foreground', label: 'Not started' }
    }
    
    if (weight && reps) {
      return { icon: TrendingUp, color: 'text-green-500', label: 'Exceeded target' }
    }
    
    if (!weight && !reps) {
      return { icon: TrendingDown, color: 'text-red-500', label: 'Below target' }
    }
    
    return { icon: Minus, color: 'text-yellow-500', label: 'Partial' }
  }

  const calculateProgress = () => {
    if (setsData.length === 0) return 0
    const completedSets = setsData.filter(set => set.completed).length
    return (completedSets / setsData.length) * 100
  }

  const getTotalReps = () => setsData.reduce((sum, set) => sum + set.actual_reps, 0)
  const getTotalVolume = () => setsData.reduce((sum, set) => sum + (set.actual_weight * set.actual_reps), 0)
  const getCompletedSetsCount = () => setsData.filter(set => set.completed).length
  const getAvgWeight = () => {
    const completedSets = setsData.filter(set => set.completed)
    if (completedSets.length === 0) return 0
    return completedSets.reduce((sum, set) => sum + set.actual_weight, 0) / completedSets.length
  }

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <Card className="neo-card bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Progress</span>
            </div>
            <Badge 
              variant="secondary" 
              className={cn(
                "font-mono",
                getCompletedSetsCount() === targetSets 
                  ? "bg-green-500 text-white" 
                  : "bg-primary/10 text-primary"
              )}
            >
              {getCompletedSetsCount()}/{setsData.length} Sets
            </Badge>
          </div>
          
          <Progress value={calculateProgress()} className="h-3 mb-4" />
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-foreground font-mono">{getTotalReps()}</span>
              <span className="text-muted-foreground">Total Reps</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-foreground font-mono">{getTotalVolume().toFixed(0)}</span>
              <span className="text-muted-foreground">Volume (kg)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-foreground font-mono">{getAvgWeight().toFixed(1)}</span>
              <span className="text-muted-foreground">Avg Weight</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Set Cards */}
      <div className="space-y-3">
        {setsData.map((set) => {
          const { weight: weightMet, reps: repsMet } = meetsTarget(set)
          const performance = getPerformanceIndicator(set)
          const PerformanceIcon = performance.icon

          return (
            <Card
              key={set.set_number}
              className={cn(
                "neo-card bg-card transition-all",
                set.completed && "border-green-500 border-2"
              )}
            >
              <CardContent className="p-4">
                {/* Set Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Manual Toggle Button */}
                    <button
                      onClick={() => updateSet(set.set_number, 'completed', !set.completed)}
                      className="flex-shrink-0 transition-transform hover:scale-110"
                      title={set.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {set.completed ? (
                        <CheckCircle className="w-7 h-7 text-green-500" />
                      ) : (
                        <Circle className="w-7 h-7 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                    
                    <div>
                      <div className="font-bold text-lg text-foreground">Set {set.set_number}</div>
                      {set.completed && (
                        <Badge className="bg-green-500 text-white text-xs mt-1">Completed</Badge>
                      )}
                    </div>
                  </div>

                  {/* Performance Indicator */}
                  <div className={cn("flex items-center gap-1", performance.color)}>
                    <PerformanceIcon className="w-4 h-4" />
                    <span className="text-xs font-mono">{performance.label}</span>
                  </div>
                </div>

                {/* Target Reference */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1 font-semibold font-mono">TARGET</div>
                  <div className="text-sm text-foreground font-medium font-mono">
                    {set.target_weight} kg × {set.target_reps} reps
                  </div>
                </div>

                {/* Actual Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Weight Input */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-semibold">WEIGHT (kg)</span>
                      {set.actual_weight > 0 && (
                        <span className={cn(
                          "text-xs font-mono font-bold",
                          weightMet ? "text-green-500" : "text-red-500"
                        )}>
                          {weightMet ? '✓ Met' : `${set.actual_weight - set.target_weight > 0 ? '+' : ''}${(set.actual_weight - set.target_weight).toFixed(1)}`}
                        </span>
                      )}
                    </div>
                    <CounterInput
                      value={set.actual_weight}
                      onChange={(value) => updateSet(set.set_number, 'actual_weight', value)}
                      min={0}
                      max={500}
                      step={2.5}
                      size="sm"
                      unit="kg"
                    />
                  </div>

                  {/* Reps Input */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-semibold">REPS</span>
                      {set.actual_reps > 0 && (
                        <span className={cn(
                          "text-xs font-mono font-bold",
                          repsMet ? "text-green-500" : "text-red-500"
                        )}>
                          {repsMet ? '✓ Met' : `${set.actual_reps - set.target_reps > 0 ? '+' : ''}${set.actual_reps - set.target_reps}`}
                        </span>
                      )}
                    </div>
                    <CounterInput
                      value={set.actual_reps}
                      onChange={(value) => updateSet(set.set_number, 'actual_reps', value)}
                      min={0}
                      max={100}
                      step={1}
                      size="sm"
                      unit="reps"
                    />
                  </div>
                </div>

                {/* Visual Indicators */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className={cn(
                      "flex items-center gap-2 p-2 rounded-lg",
                      weightMet ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
                    )}>
                      {weightMet ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>Weight: {weightMet ? 'Target met' : 'Below target'}</span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 p-2 rounded-lg",
                      repsMet ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
                    )}>
                      {repsMet ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>Reps: {repsMet ? 'Target met' : 'Below target'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Helper Text */}
      <div className="text-center text-xs text-muted-foreground font-mono p-3 bg-muted/30 rounded-lg">
        💡 Click the circle icon to manually mark a set as complete, regardless of target values
      </div>
    </div>
  )
}
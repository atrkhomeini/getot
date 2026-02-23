'use client'

import { useState } from 'react'
import { Dumbbell, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PerSetTracker, SetData } from '@/components/per-set-tracker'
import { cn } from '@/lib/utils'

interface ExerciseLogCardWithPerSetProps {
  exercise: {
    id: string
    name: string
    category: string
    target_sets: number
    target_reps: number
    target_weight: number
    gif_url?: string
  }
  existingSetsData?: SetData[]
  onSave?: (logData: ExerciseLogDataWithPerSet) => void
  onCancel?: () => void
  className?: string
  isExpanded?: boolean
}

export interface ExerciseLogDataWithPerSet {
  exercise_id: string
  actual_sets: number
  actual_reps: number
  actual_weight: number
  sets_data: SetData[]
}

export function ExerciseLogCardWithPerSet({
  exercise,
  existingSetsData,
  onSave,
  onCancel,
  className,
  isExpanded: initialExpanded = false,
}: ExerciseLogCardWithPerSetProps) {
  const [setsData, setSetsData] = useState<SetData[]>(existingSetsData || [])
  const [isExpanded, setIsExpanded] = useState(initialExpanded)
  const [isSaving, setIsSaving] = useState(false)

  const handleSetsDataChange = (newSetsData: SetData[]) => {
    setSetsData(newSetsData)
  }

  const calculateSummary = () => {
    const completedSets = setsData.filter(set => set.completed).length
    const totalReps = setsData.reduce((sum, set) => sum + set.actual_reps, 0)
    const totalWeight = setsData.reduce((sum, set) => sum + set.actual_weight, 0)
    const avgWeight = completedSets > 0 ? totalWeight / completedSets : 0

    return {
      completedSets,
      totalReps,
      avgWeight: Math.round(avgWeight * 10) / 10,
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const summary = calculateSummary()
      const logData: ExerciseLogDataWithPerSet = {
        exercise_id: exercise.id,
        actual_sets: summary.completedSets,
        actual_reps: summary.totalReps,
        actual_weight: summary.avgWeight,
        sets_data: setsData,
      }

      if (onSave) {
        await onSave(logData)
      }
    } catch (error) {
      console.error('Error saving log:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    const initialSets: SetData[] = Array.from({ length: exercise.target_sets }, (_, i) => ({
      set_number: i + 1,
      target_weight: exercise.target_weight,
      target_reps: exercise.target_reps,
      actual_weight: 0,
      actual_reps: 0,
      completed: false,
    }))
    setSetsData(initialSets)
  }

  const summary = calculateSummary()
  const isFullyCompleted = summary.completedSets === exercise.target_sets

  return (
    <Card className={cn('neo-card bg-card', className, isFullyCompleted && 'border-green-500')}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold text-foreground">
                {exercise.name}
              </CardTitle>
              {isFullyCompleted && (
                <span className="text-xs font-mono bg-green-500 text-white px-2 py-1 rounded">
                  ✓ Complete
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-muted-foreground capitalize">
              {exercise.category}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {exercise.gif_url && (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img src={exercise.gif_url} alt={exercise.name} className="w-full h-full object-cover" />
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isExpanded && (
          <>
            {/* Collapsed Summary */}
            <div className="p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
              <p className="text-xs font-mono text-muted-foreground mb-2">PROGRESS SUMMARY</p>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary font-mono">
                    {summary.completedSets}
                    <span className="text-sm ml-1">/{exercise.target_sets}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Sets Done</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary font-mono">{summary.totalReps}</p>
                  <p className="text-xs text-muted-foreground">Total Reps</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary font-mono">
                    {summary.avgWeight}
                    <span className="text-sm ml-1">kg</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Weight</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleReset} variant="outline" className="flex-1 neo-button font-mono">
                <X className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={() => setIsExpanded(true)}
                className="flex-1 neo-button font-mono bg-primary text-primary-foreground"
              >
                <Dumbbell className="w-4 h-4 mr-2" />
                Track Sets
              </Button>
            </div>
          </>
        )}

        {isExpanded && (
          <div className="space-y-4">
            <PerSetTracker
              targetSets={exercise.target_sets}
              targetReps={exercise.target_reps}
              targetWeight={exercise.target_weight}
              setsData={setsData}
              onChange={handleSetsDataChange}
            />

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setIsExpanded(false)} variant="outline" className="flex-1 neo-button font-mono">
                <ChevronUp className="w-4 h-4 mr-2" />
                Collapse
              </Button>
              <Button onClick={handleReset} variant="outline" className="flex-1 neo-button font-mono">
                <X className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || summary.completedSets === 0}
                className={cn(
                  'flex-1 neo-button font-mono',
                  isFullyCompleted
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                <Check className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Log'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
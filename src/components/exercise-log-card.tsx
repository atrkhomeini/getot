'use client'

import { useState } from 'react'
import { Dumbbell, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CounterInput } from '@/components/counter-input'
import { cn } from '@/lib/utils'

interface ExerciseLogCardProps {
  exercise: {
    id: string
    name: string
    category: string
    target_sets: number
    target_reps: number
    target_weight: number
    gif_url?: string
  }
  onSave?: (logData: ExerciseLogData) => void
  onCancel?: () => void
  className?: string
}

export interface ExerciseLogData {
  exercise_id: string
  actual_sets: number
  actual_reps: number
  actual_weight: number
}

export function ExerciseLogCard({
  exercise,
  onSave,
  onCancel,
  className,
}: ExerciseLogCardProps) {
  const [actualSets, setActualSets] = useState(exercise.target_sets)
  const [actualReps, setActualReps] = useState(exercise.target_reps)
  const [actualWeight, setActualWeight] = useState(exercise.target_weight || 0)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const logData: ExerciseLogData = {
        exercise_id: exercise.id,
        actual_sets: actualSets,
        actual_reps: actualReps,
        actual_weight: actualWeight,
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
    setActualSets(exercise.target_sets)
    setActualReps(exercise.target_reps)
    setActualWeight(exercise.target_weight || 0)
  }

  const isCompleted = 
    actualSets >= exercise.target_sets && 
    actualReps >= exercise.target_reps && 
    actualWeight >= (exercise.target_weight || 0)

  return (
    <Card className={cn('neo-card bg-card', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-foreground mb-1">
              {exercise.name}
            </CardTitle>
            <p className="text-xs font-mono text-muted-foreground capitalize">
              {exercise.category}
            </p>
          </div>
          {exercise.gif_url && (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 ml-4">
              <img
                src={exercise.gif_url}
                alt={exercise.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Target Display */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs font-mono text-muted-foreground mb-2">TARGET</p>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground font-mono">
                {exercise.target_sets}
              </p>
              <p className="text-xs text-muted-foreground">Sets</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground font-mono">
                {exercise.target_reps}
              </p>
              <p className="text-xs text-muted-foreground">Reps</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground font-mono">
                {exercise.target_weight || 0}
                <span className="text-sm ml-1">kg</span>
              </p>
              <p className="text-xs text-muted-foreground">Weight</p>
            </div>
          </div>
        </div>

        {/* Actual Input with +/- Buttons */}
        <div>
          <p className="text-xs font-mono text-muted-foreground mb-3">ACTUAL</p>
          <div className="flex items-center justify-around gap-2">
            <CounterInput
              label="Sets"
              value={actualSets}
              onChange={setActualSets}
              min={0}
              max={20}
              step={1}
              size="lg"
            />
            <CounterInput
              label="Reps"
              value={actualReps}
              onChange={setActualReps}
              min={0}
              max={100}
              step={1}
              size="lg"
            />
            <CounterInput
              label="Weight"
              value={actualWeight}
              onChange={setActualWeight}
              min={0}
              max={500}
              step={0.5}
              unit="kg"
              size="lg"
            />
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">Progress</span>
            <span className={cn(
              'font-mono font-bold',
              isCompleted ? 'text-green-600' : 'text-foreground'
            )}>
              {isCompleted ? '✓ Target Met!' : 'In Progress'}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                isCompleted ? 'bg-green-500' : 'bg-primary'
              )}
              style={{
                width: `${Math.min(
                  100,
                  Math.min(
                    (actualSets / exercise.target_sets) * 100,
                    (actualReps / exercise.target_reps) * 100,
                    exercise.target_weight > 0 
                      ? (actualWeight / exercise.target_weight) * 100 
                      : 100
                  )
                )}%`
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1 neo-button font-mono"
          >
            <X className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'flex-1 neo-button font-mono',
              isCompleted 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-primary text-primary-foreground'
            )}
          >
            <Check className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Log'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
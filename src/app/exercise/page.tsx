'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import UserLayout from '@/components/user-layout'
import { CounterInput } from '@/components/counter-input'
import { useAppStore } from '@/lib/store'
import { ArrowLeft, Save, TrendingUp, Target } from 'lucide-react'
import { toast } from 'sonner'

type Exercise = Database['public']['Tables']['exercises']['Row']
type WorkoutLog = Database['public']['Tables']['workout_logs']['Row']

export default function ExercisePage() {
  const router = useRouter()
  const { currentUser, selectedExercise } = useAppStore()
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null)
  const [actualSets, setActualSets] = useState(0)
  const [actualReps, setActualReps] = useState(0)
  const [actualWeight, setActualWeight] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!currentUser || !selectedExercise) {
      router.push('/home')
      return
    }
    fetchWorkoutLog()
  }, [currentUser, selectedExercise, router])

  const fetchWorkoutLog = async () => {
    if (!currentUser || !selectedExercise) return

    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('exercise_id', selectedExercise.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setWorkoutLog(data)
        setActualSets(data.actual_sets)
        setActualReps(data.actual_reps)
        setActualWeight(data.weight || 0)
      } else {
        setActualSets(selectedExercise.target_sets)
        setActualReps(selectedExercise.target_reps)
        setActualWeight(selectedExercise.target_weight || 0)
      }
    } catch (err) {
      console.error('Error fetching workout log:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentUser || !selectedExercise) return

    setSaving(true)
    try {
      if (workoutLog) {
        // Update existing log
        const { error } = await supabase
          .from('workout_logs')
          .update({
            actual_sets: actualSets,
            actual_reps: actualReps,
            weight: actualWeight,
          })
          .eq('id', workoutLog.id)

        if (error) throw error
      } else {
        // Create new log
        const { error } = await supabase
          .from('workout_logs')
          .insert({
            user_id: currentUser.id,
            exercise_id: selectedExercise.id,
            actual_sets: actualSets,
            actual_reps: actualReps,
            weight: actualWeight,
            date: new Date().toISOString().split('T')[0],
          })

        if (error) throw error
      }

      toast.success('Workout log saved successfully!')
      await fetchWorkoutLog()
    } catch (err) {
      console.error('Error saving workout log:', err)
      toast.error('Failed to save workout log')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !selectedExercise) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-foreground">Loading...</div>
        </div>
      </UserLayout>
    )
  }

  const completionPercentage = Math.min(
    Math.round(
      Math.min(
        (actualSets / selectedExercise.target_sets) * 100,
        (actualReps / selectedExercise.target_reps) * 100,
        selectedExercise.target_weight > 0 
          ? (actualWeight / selectedExercise.target_weight) * 100 
          : 100
      )
    ),
    100
  )

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/home')}
          className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-mono text-sm">Back to Exercises</span>
        </button>

        {/* Exercise Header */}
        <div className="neo-card bg-card rounded-2xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {selectedExercise.name}
          </h1>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-bold font-mono capitalize">
              {selectedExercise.category}
            </span>
            <span className="font-mono text-muted-foreground text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Exercise GIF */}
        {selectedExercise.gif_url && (
          <div className="neo-card bg-card rounded-2xl overflow-hidden mb-6">
            <img
              src={selectedExercise.gif_url}
              alt={selectedExercise.name}
              className="w-full aspect-video object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Target vs Actual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Target */}
          <div className="neo-card bg-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-secondary" />
              <h2 className="text-xl font-bold text-foreground">Target</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-mono">Sets</span>
                <span className="text-2xl font-bold text-foreground font-mono">
                  {selectedExercise.target_sets}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-mono">Reps</span>
                <span className="text-2xl font-bold text-foreground font-mono">
                  {selectedExercise.target_reps}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-mono">Weight</span>
                <span className="text-2xl font-bold text-foreground font-mono">
                  {selectedExercise.target_weight || 0}<span className="text-lg ml-1">kg</span>
                </span>
              </div>
            </div>
          </div>

          {/* Actual */}
          <div className="neo-card bg-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Actual</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-muted-foreground w-12">Sets</span>
                <CounterInput
                  value={actualSets}
                  onChange={setActualSets}
                  min={0}
                  max={20}
                  step={1}
                  compact
                  className="flex-1"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-muted-foreground w-12">Reps</span>
                <CounterInput
                  value={actualReps}
                  onChange={setActualReps}
                  min={0}
                  max={100}
                  step={1}
                  compact
                  className="flex-1"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-muted-foreground w-12">Weight</span>
                <CounterInput
                  value={actualWeight}
                  onChange={setActualWeight}
                  min={0}
                  max={500}
                  step={0.5}
                  unit="kg"
                  compact
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        {/* Progress */}
        <div className="neo-card bg-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground font-mono">Completion</span>
            <span className="font-bold text-foreground font-mono">{completionPercentage}%</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden border-2 border-border">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>
        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="neo-button w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Workout'}
        </button>
      </div>
    </UserLayout>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import UserLayout from '@/components/user-layout'
import { useAppStore } from '@/lib/store'
import { ArrowLeft, Target } from 'lucide-react'
import { toast } from 'sonner'
import { 
  ExerciseLogCardWithPerSet, 
  ExerciseLogDataWithPerSet 
} from '@/components/exercise-log-card-with-perset'
import { SetData, SetType } from '@/components/per-sets-tracker'
import { requestNotificationPermission, scheduleCheckOutReminder } from '@/lib/notifications'

type Exercise = Database['public']['Tables']['exercises']['Row']
type WorkoutLog = Database['public']['Tables']['workout_logs']['Row']

export default function ExercisePage() {
  const router = useRouter()
  const { currentUser, selectedExercise, currentCheckIn, setCurrentCheckIn, notificationsEnabled, setNotificationsEnabled } = useAppStore()
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null)
  const [existingSetsData, setExistingSetsData] = useState<SetData[]>([])
  const [loading, setLoading] = useState(true)

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
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setWorkoutLog(data)
        
        if (data.sets_data && Array.isArray(data.sets_data) && data.sets_data.length > 0) {
          const parsedSets = (data.sets_data as SetData[]).map(set => ({
            set_number: set.set_number,
            target_weight: set.target_weight,
            target_reps: set.target_reps,
            actual_weight: set.actual_weight,
            actual_reps: set.actual_reps,
            completed: set.completed,
            set_type: (set.set_type || 'normal') as SetType,
          }))
          setExistingSetsData(parsedSets)
        } else {
          const fallbackSets: SetData[] = Array.from(
            { length: selectedExercise.target_sets }, 
            (_, i) => ({
              set_number: i + 1,
              target_weight: selectedExercise.target_weight,
              target_reps: selectedExercise.target_reps,
              actual_weight: data.weight || 0,
              actual_reps: Math.round((data.actual_reps || 0) / (selectedExercise.target_sets || 1)),
              completed: false,
              set_type: 'normal' as SetType,
            })
          )
          setExistingSetsData(fallbackSets)
        }
      } else {
        setExistingSetsData([])
      }
    } catch (err) {
      console.error('Error fetching workout log:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveLog = async (logData: ExerciseLogDataWithPerSet) => {
    if (!currentUser || !selectedExercise) return

    // === SHOW LOADING STATE ===
    toast.loading('Saving workout...', { id: 'save-log' })

    try {
      // === AUTO CHECK-IN ===
      if (!currentCheckIn) {
        try {
          const { data, error } = await supabase
            .from('check_ins')
            .insert({
              user_id: currentUser.id,
              check_in_time: new Date().toISOString(),
            })
            .select()
            .single()

          if (!error && data) {
            setCurrentCheckIn(data)
            const hasPermission = await requestNotificationPermission()
            setNotificationsEnabled(hasPermission)
            if (hasPermission) {
              scheduleCheckOutReminder(new Date(data.check_in_time))
            }
            toast.info('Auto checked in!', { id: 'checkin' })
          }
        } catch (err) {
          console.error('Auto check-in failed:', err)
        }
      }

      // === SAVE TO DATABASE (WAIT FOR IT) ===
      if (workoutLog) {
        const { error } = await supabase
          .from('workout_logs')
          .update({
            actual_sets: logData.actual_sets,
            actual_reps: logData.actual_reps,
            weight: logData.actual_weight,
            sets_data: logData.sets_data,
          })
          .eq('id', workoutLog.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('workout_logs')
          .insert({
            user_id: currentUser.id,
            exercise_id: selectedExercise.id,
            actual_sets: logData.actual_sets,
            actual_reps: logData.actual_reps,
            weight: logData.actual_weight,
            date: new Date().toISOString().split('T')[0],
            sets_data: logData.sets_data,
          })
        if (error) throw error
      }

      // === MARK EXERCISE COMPLETE ===
      const { data: progress } = await supabase
        .from('user_progress')
        .select('current_day_number')
        .eq('user_id', currentUser.id)
        .single()

      if (progress) {
        await fetch('/api/workout-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.id,
            day_number: progress.current_day_number,
            exercise_id: selectedExercise.id,
            completed: true,
          }),
        })
      }

      // === SUCCESS: NOW NAVIGATE ===
      toast.success('Workout saved!', { id: 'save-log' })
      router.push('/home')

    } catch (err: any) {
      console.error('Save failed:', err)
      toast.error(`Failed to save: ${err.message}`, { id: 'save-log' })
      // DON'T navigate - stay on page so user can retry
    }
  }

  const saveLogToDatabase = async (logData: ExerciseLogDataWithPerSet) => {
    try {
      if (workoutLog) {
        const { error } = await supabase
          .from('workout_logs')
          .update({
            actual_sets: logData.actual_sets,
            actual_reps: logData.actual_reps,
            weight: logData.actual_weight,
            sets_data: logData.sets_data,
          })
          .eq('id', workoutLog.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('workout_logs')
          .insert({
            user_id: currentUser!.id,
            exercise_id: selectedExercise!.id,
            actual_sets: logData.actual_sets,
            actual_reps: logData.actual_reps,
            weight: logData.actual_weight,
            date: new Date().toISOString().split('T')[0],
            sets_data: logData.sets_data,
          })
        if (error) throw error
      }

      // Mark exercise as completed in workout session
      const { data: progress } = await supabase
        .from('user_progress')
        .select('current_day_number')
        .eq('user_id', currentUser!.id)
        .single()

      if (progress) {
        await fetch('/api/workout-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser!.id,
            day_number: progress.current_day_number,
            exercise_id: selectedExercise!.id,
            completed: true,
          }),
        })
      }
    } catch (err) {
      console.error('Background sync error:', err)
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
              src={selectedExercise.gif_url.startsWith('/') ? selectedExercise.gif_url : selectedExercise.gif_url}
              alt={selectedExercise.name}
              className="w-full aspect-video object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Target Summary */}
        <div className="neo-card bg-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-secondary" />
            <h2 className="text-xl font-bold text-foreground">Target</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted rounded-xl">
              <p className="text-3xl font-bold text-foreground font-mono">
                {selectedExercise.target_sets}
              </p>
              <p className="text-sm text-muted-foreground font-mono">Sets</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-xl">
              <p className="text-3xl font-bold text-foreground font-mono">
                {selectedExercise.target_reps}
              </p>
              <p className="text-sm text-muted-foreground font-mono">Reps</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-xl">
              <p className="text-3xl font-bold text-foreground font-mono">
                {selectedExercise.target_weight || 0}
              </p>
              <p className="text-sm text-muted-foreground font-mono">kg</p>
            </div>
          </div>
        </div>

        {/* Per-Set Log Card */}
        <ExerciseLogCardWithPerSet
          exercise={{
            id: selectedExercise.id,
            name: selectedExercise.name,
            category: selectedExercise.category,
            target_sets: selectedExercise.target_sets,
            target_reps: selectedExercise.target_reps,
            target_weight: selectedExercise.target_weight || 0,
            gif_url: selectedExercise.gif_url,
          }}
          existingSetsData={existingSetsData}
          onSave={handleSaveLog}
          isExpanded={true}
        />
      </div>
    </UserLayout>
  )
}
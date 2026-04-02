'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import UserLayout from '@/components/user-layout'
import { useAppStore } from '@/lib/store'
import { ArrowLeft, Target, Save, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PerSetTracker, SetData, SetType } from '@/components/per-sets-tracker'
import { requestNotificationPermission, scheduleCheckOutReminder } from '@/lib/notifications'

type Exercise = Database['public']['Tables']['exercises']['Row']
type WorkoutLog = Database['public']['Tables']['workout_logs']['Row']

interface ExerciseLogDataWithPerSet {
  exercise_id: string
  actual_sets: number
  actual_reps: number
  actual_weight: number
  sets_data: SetData[]
  session_notes?: string
}

const DRAFT_KEY_PREFIX = 'workout_draft_'

export default function ExercisePage() {
  const router = useRouter()
  const { currentUser, selectedExercise, currentCheckIn, setCurrentCheckIn, notificationsEnabled, setNotificationsEnabled } = useAppStore()
  
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null)
  const [existingSetsData, setExistingSetsData] = useState<SetData[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionNotes, setSessionNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Draft recovery state
  const [hasDraft, setHasDraft] = useState(false)
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)

  // Generate draft key
  const getDraftKey = useCallback(() => {
    if (!currentUser || !selectedExercise) return null
    return `${DRAFT_KEY_PREFIX}${currentUser.id}_${selectedExercise.id}_${new Date().toISOString().split('T')[0]}`
  }, [currentUser, selectedExercise])

  // Load data on mount
  useEffect(() => {
    if (!currentUser || !selectedExercise) {
      router.push('/home')
      return
    }
    
    // First check for draft
    const draftKey = getDraftKey()
    if (draftKey) {
      const savedDraft = localStorage.getItem(draftKey)
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          setExistingSetsData(draft.sets_data || [])
          setSessionNotes(draft.session_notes || '')
          setHasDraft(true)
          setShowRecoveryDialog(true)
          setLoading(false)
          return
        } catch (e) {
          console.error('Failed to parse draft:', e)
        }
      }
    }
    
    fetchWorkoutLog()
  }, [currentUser, selectedExercise, router])

  // Auto-save draft whenever data changes
  useEffect(() => {
    if (loading || !getDraftKey()) return
    
    saveDraft()
  }, [existingSetsData, sessionNotes])

  const saveDraft = useCallback(() => {
    const draftKey = getDraftKey()
    if (!draftKey) return

    const draft = {
      sets_data: existingSetsData,
      session_notes: sessionNotes,
      timestamp: Date.now()
    }

    localStorage.setItem(draftKey, JSON.stringify(draft))
  }, [getDraftKey, existingSetsData, sessionNotes])

  const clearDraft = useCallback(() => {
    const draftKey = getDraftKey()
    if (draftKey) {
      localStorage.removeItem(draftKey)
      setHasDraft(false)
    }
  }, [getDraftKey])

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

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setWorkoutLog(data)
        setSessionNotes(data.notes || '')
        
        if (data.sets_data && Array.isArray(data.sets_data) && data.sets_data.length > 0) {
          const parsedSets = (data.sets_data as SetData[]).map(set => ({
            ...set,
            set_type: (set.set_type || 'normal') as SetType,
            notes: set.notes || ''
          }))
          setExistingSetsData(parsedSets)
        } else {
          const fallbackSets: SetData[] = Array.from(
            { length: selectedExercise.target_sets }, 
            (_, i) => ({
              set_number: i + 1,
              target_weight: selectedExercise.target_weight,
              target_reps: selectedExercise.target_reps,
              actual_weight: 0,
              actual_reps: 0,
              completed: false,
              set_type: 'normal' as SetType,
              notes: ''
            })
          )
          setExistingSetsData(fallbackSets)
        }
      } else {
        // Initialize empty sets
        const emptySets: SetData[] = Array.from(
          { length: selectedExercise.target_sets }, 
          (_, i) => ({
            set_number: i + 1,
            target_weight: selectedExercise.target_weight,
            target_reps: selectedExercise.target_reps,
            actual_weight: 0,
            actual_reps: 0,
            completed: false,
            set_type: 'normal' as SetType,
            notes: ''
          })
        )
        setExistingSetsData(emptySets)
      }
    } catch (err) {
      console.error('Error fetching workout log:', err)
      toast.error('Failed to load workout data')
    } finally {
      setLoading(false)
    }
  }

  const handleRecoverDraft = () => {
    setShowRecoveryDialog(false)
    toast.success('Draft recovered! Your previous data has been restored.')
  }

  const handleDiscardDraft = () => {
    clearDraft()
    setShowRecoveryDialog(false)
    fetchWorkoutLog()
  }

  const handleSaveLog = async () => {
    if (!currentUser || !selectedExercise) return

    setIsSaving(true)
    setSaveError(null)

    const logData: ExerciseLogDataWithPerSet = {
      exercise_id: selectedExercise.id,
      actual_sets: existingSetsData.filter(s => s.completed).length,
      actual_reps: existingSetsData.reduce((sum, s) => sum + s.actual_reps, 0),
      actual_weight: existingSetsData
        .filter(s => s.set_type !== 'warmup')
        .reduce((sum, s) => sum + s.actual_weight, 0) / 
        Math.max(1, existingSetsData.filter(s => s.set_type !== 'warmup').length),
      sets_data: existingSetsData,
      session_notes: sessionNotes,
    }

    try {
      // === STEP 1: AUTO CHECK-IN ===
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
            toast.info('Auto checked in!', { duration: 2000 })
          }
        } catch (checkInError) {
          console.error('Auto check-in failed (non-critical):', checkInError)
          // Continue even if check-in fails
        }
      }

      // === STEP 2: SAVE TO DATABASE (CRITICAL - WAIT FOR THIS) ===
      let saveError: any = null

      if (workoutLog) {
        const { error } = await supabase
          .from('workout_logs')
          .update({
            actual_sets: logData.actual_sets,
            actual_reps: logData.actual_reps,
            weight: logData.actual_weight,
            sets_data: logData.sets_data,
            notes: logData.session_notes,
          })
          .eq('id', workoutLog.id)
        saveError = error
      } else {
        const { error } = await supabase
          .from('workout_logs')
          .insert({
            user_id: currentUser.id,
            exercise_id: logData.exercise_id,
            actual_sets: logData.actual_sets,
            actual_reps: logData.actual_reps,
            weight: logData.actual_weight,
            date: new Date().toISOString().split('T')[0],
            sets_data: logData.sets_data,
            notes: logData.session_notes,
          })
        saveError = error
      }

      if (saveError) throw saveError

      // === STEP 3: MARK EXERCISE COMPLETE ===
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

      // === STEP 4: SUCCESS ===
      // Clear draft ONLY after successful save
      clearDraft()
      
      toast.success('Workout saved successfully!', { duration: 3000 })
      
      // Navigate only after everything is confirmed
      router.push('/home')

    } catch (err: any) {
      console.error('Save failed:', err)
      
      // Save draft again to ensure it's fresh
      saveDraft()
      
      const errorMessage = err?.message || 'Unknown error occurred'
      setSaveError(errorMessage)
      
      toast.error(`Failed to save: ${errorMessage}`, { 
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: handleSaveLog
        }
      })
      
      // DO NOT NAVIGATE - Stay on page so user can retry
    } finally {
      setIsSaving(false)
    }
  }

  // Handle set data changes
  const handleSetsChange = (newSets: SetData[]) => {
    setExistingSetsData(newSets)
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
        <button
          onClick={() => router.push('/home')}
          className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-mono text-sm">Back to Exercises</span>
        </button>

        {/* Header */}
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

        {/* GIF */}
        {selectedExercise.gif_url && (
          <div className="neo-card bg-card rounded-2xl overflow-hidden mb-6">
            <img
              src={selectedExercise.gif_url.startsWith('/') ? selectedExercise.gif_url : selectedExercise.gif_url}
              alt={selectedExercise.name}
              className="w-full aspect-video object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        )}

        {/* Target */}
        <div className="neo-card bg-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-secondary" />
            <h2 className="text-xl font-bold text-foreground">Target</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted rounded-xl">
              <p className="text-3xl font-bold text-foreground font-mono">{selectedExercise.target_sets}</p>
              <p className="text-sm text-muted-foreground font-mono">Sets</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-xl">
              <p className="text-3xl font-bold text-foreground font-mono">{selectedExercise.target_reps}</p>
              <p className="text-sm text-muted-foreground font-mono">Reps</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-xl">
              <p className="text-3xl font-bold text-foreground font-mono">{selectedExercise.target_weight || 0}</p>
              <p className="text-sm text-muted-foreground font-mono">kg</p>
            </div>
          </div>
        </div>

        {/* Session Notes */}
        <div className="neo-card bg-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📝</span>
            <h2 className="text-xl font-bold text-foreground">Session Notes</h2>
          </div>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="How was your workout? Any PRs, difficulties, or things to remember?"
            className="w-full p-4 rounded-xl bg-muted border-2 border-border focus:border-primary focus:outline-none resize-none font-mono text-sm"
            rows={4}
            disabled={isSaving}
          />
        </div>

        {/* Per-Set Tracker */}
        <PerSetTracker
          targetSets={selectedExercise.target_sets}
          targetReps={selectedExercise.target_reps}
          targetWeight={selectedExercise.target_weight || 0}
          setsData={existingSetsData}
          onChange={handleSetsChange}
        />

        {/* Error Display */}
        {saveError && (
          <div className="mt-6 p-4 bg-destructive/10 border-2 border-destructive rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-destructive">Failed to save workout</p>
                <p className="text-sm text-muted-foreground font-mono mt-1">{saveError}</p>
                <p className="text-xs text-muted-foreground font-mono mt-2">
                  Your data is saved locally. Check your connection and try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Draft Indicator */}
        {hasDraft && !isSaving && (
          <div className="mt-4 text-xs text-muted-foreground font-mono flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            Draft auto-saved locally
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push('/home')}
            disabled={isSaving}
            className="flex-1 py-4 rounded-xl bg-muted text-foreground font-mono hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveLog}
            disabled={isSaving}
            className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground font-bold font-mono hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Workout
              </>
            )}
          </button>
        </div>
      </div>

      {/* Draft Recovery Dialog */}
      {showRecoveryDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="neo-card bg-card rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <h3 className="text-xl font-bold text-foreground">Unsaved Draft Found</h3>
            </div>
            <p className="text-sm text-muted-foreground font-mono mb-6">
              We found unsaved workout data from your previous session. Would you like to recover it or start fresh?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDiscardDraft}
                className="flex-1 py-3 rounded-xl bg-muted text-foreground font-mono hover:bg-muted/80 transition-colors"
              >
                Start Fresh
              </button>
              <button
                onClick={handleRecoverDraft}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold font-mono hover:bg-primary/90 transition-colors"
              >
                Recover Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UserLayout from '@/components/user-layout'
import { useAppStore } from '@/lib/store'
import { LogOut as CheckOut, Clock, Timer, CheckCircle2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export default function CheckOutPage() {
  const router = useRouter()
  const { currentUser, currentCheckIn, setCurrentCheckIn } = useAppStore()
  const [canCheckOut, setCanCheckOut] = useState(false)
  const [duration, setDuration] = useState<string>('0:00')
  const [checkedOut, setCheckedOut] = useState(false)
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null)
  const [nextDay, setNextDay] = useState<number | null>(null)
  const [currentDay, setCurrentDay] = useState<number | null>(null)

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }

    // Check if checked in
    if (!currentCheckIn) {
      router.push('/check-in')
      return
    }

    setCanCheckOut(true)
    fetchCurrentDay()

    // Update duration every second
    const interval = setInterval(() => {
      if (currentCheckIn && !checkedOut) {
        const now = new Date()
        const checkIn = new Date(currentCheckIn.check_in_time)
        const diff = Math.floor((now.getTime() - checkIn.getTime()) / 1000)
        const hours = Math.floor(diff / 3600)
        const minutes = Math.floor((diff % 3600) / 60)
        setDuration(`${hours}:${minutes.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [currentUser, currentCheckIn, checkedOut, router])

  const fetchCurrentDay = async () => {
    if (!currentUser) return

    try {
      const { data: progress, error } = await supabase
        .from('user_progress')
        .select('current_day_number')
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (progress) {
        setCurrentDay(progress.current_day_number)
      } else {
        setCurrentDay(1) // Default to Day 1
      }
    } catch (err) {
      console.error('Error fetching current day:', err)
      setCurrentDay(1)
    }
  }

  const handleCheckOut = async () => {
    if (!currentUser || !currentCheckIn) return

    try {
      const now = new Date()
      const checkIn = new Date(currentCheckIn.check_in_time)
      const durationMinutes = Math.floor((now.getTime() - checkIn.getTime()) / (1000 * 60))

      // Step 1: Update check_in record
      const { data, error: checkInError } = await supabase
        .from('check_ins')
        .update({
          check_out_time: now.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', currentCheckIn.id)
        .select()
        .single()

      if (checkInError) {
        console.error('Check-in update error:', checkInError)
        throw checkInError
      }

      // Step 2: Get user's current progress (or create if not exists)
      let progress = null
      const { data: existingProgress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (existingProgress) {
        progress = existingProgress
      } else {
        // Create progress record if it doesn't exist
        const { data: newProgress, error: createError } = await supabase
          .from('user_progress')
          .insert({
            user_id: currentUser.id,
            current_day_number: 1,
            total_workouts_completed: 0,
          })
          .select()
          .single()

        if (createError) {
          console.error('Create progress error:', createError)
          throw createError
        }
        progress = newProgress
      }

      // Step 3: Mark current session as complete (if exists)
      await supabase
        .from('workout_sessions')
        .update({
          is_complete: true,
          completed_at: now.toISOString(),
        })
        .eq('user_id', currentUser.id)
        .eq('day_number', progress.current_day_number)
        .eq('is_complete', false)

      // Step 4: Get max day number to know when to cycle
      const { data: maxDayResult } = await supabase
        .from('workout_sequences')
        .select('day_number')
        .eq('user_id', currentUser.id)
        .order('day_number', { ascending: false })
        .limit(1)

      const maxDay = maxDayResult?.[0]?.day_number || 1
      const nextDayNumber = progress.current_day_number >= maxDay ? 1 : progress.current_day_number + 1

      // Step 5: Advance user to next day
      const { error: updateError } = await supabase
        .from('user_progress')
        .update({
          current_day_number: nextDayNumber,
          last_workout_date: now.toISOString().split('T')[0],
          total_workouts_completed: progress.total_workouts_completed + 1,
          updated_at: now.toISOString(),
        })
        .eq('user_id', currentUser.id)

      if (updateError) {
        console.error('Progress update error:', updateError)
        throw updateError
      }

      setCheckedOut(true)
      setCheckOutTime(data.check_out_time)
      setNextDay(nextDayNumber)
      setCurrentCheckIn(null)
      toast.success(`Checked out! Workout duration: ${durationMinutes} minutes 🎉`)
    } catch (err: any) {
      console.error('Error checking out:', err)
      toast.error(err?.message || 'Failed to check out')
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  if (!canCheckOut) {
    return (
      <UserLayout>
        <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <div className="neo-card bg-card rounded-3xl p-12 text-center">
            <p className="font-mono text-muted-foreground">
              Please check in first
            </p>
          </div>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout>
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        {!checkedOut ? (
          <>
            {/* Check Out Button */}
            <div className="neo-card bg-card rounded-3xl p-12 text-center mb-8">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                <CheckOut className="w-16 h-16 text-destructive" />
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Check Out
              </h1>
              <p className="font-mono text-muted-foreground mb-4">
                Ready to finish your workout?
              </p>

              {/* Duration */}
              <div className="flex items-center justify-center gap-3 mb-8">
                <Timer className="w-8 h-8 text-primary" />
                <span className="font-mono text-4xl font-bold text-primary">
                  {duration}
                </span>
              </div>

              {/* Current Day Info */}
              {currentDay && (
                <div className="mb-8 p-4 bg-muted rounded-xl">
                  <p className="font-mono text-sm text-muted-foreground mb-1">
                    Completing Day {currentDay}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Will advance to next day after check-out
                  </p>
                </div>
              )}

              <button
                onClick={handleCheckOut}
                className="neo-button w-full py-6 rounded-2xl bg-destructive text-destructive-foreground font-bold text-2xl flex items-center justify-center gap-3 hover:bg-destructive/90 hover:scale-105 transition-all"
              >
                <CheckOut className="w-8 h-8" />
                CHECK OUT
              </button>
            </div>

            {/* Check In Time */}
            {currentCheckIn && (
              <div className="flex items-center gap-3 bg-muted px-6 py-4 rounded-xl border-2 border-border">
                <Clock className="w-6 h-6 text-foreground" />
                <span className="font-mono text-muted-foreground">
                  Checked in at{' '}
                  <span className="font-bold text-foreground">
                    {formatTime(currentCheckIn.check_in_time)}
                  </span>
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Checked Out */}
            <div className="neo-card bg-card rounded-3xl p-12 text-center mb-8">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-secondary/10 flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-secondary" />
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Great Workout! 🎉
              </h1>
              <p className="font-mono text-muted-foreground mb-4">
                Checked out at
              </p>
              {checkOutTime && (
                <p className="font-mono text-3xl font-bold text-primary mb-4">
                  {formatTime(checkOutTime)}
                </p>
              )}
              
              {/* Duration */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <Timer className="w-6 h-6 text-secondary" />
                <span className="font-mono text-xl font-bold text-foreground">
                  {duration}
                </span>
              </div>

              {/* Day Progression Info */}
              {nextDay !== null && (
                <div className="mb-8 p-4 bg-green-500/10 border-2 border-green-500 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="font-mono font-bold text-green-600">Day {currentDay}</span>
                    <ArrowRight className="w-4 h-4 text-green-600" />
                    <span className="font-mono font-bold text-green-600">Day {nextDay}</span>
                  </div>
                  <p className="font-mono text-xs text-green-600">
                    Your progress has been saved!
                  </p>
                </div>
              )}

              <button
                onClick={() => router.push('/home')}
                className="neo-button w-full py-6 rounded-2xl bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center gap-3 hover:bg-primary/90 hover:scale-105 transition-all"
              >
                Back to Home
              </button>
            </div>
          </>
        )}
      </div>
    </UserLayout>
  )
}
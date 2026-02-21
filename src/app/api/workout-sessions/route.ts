import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Fetch workout sessions for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const dayNumber = searchParams.get('day_number')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })

    if (dayNumber) {
      query = query.eq('day_number', parseInt(dayNumber))
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching workout sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workout sessions' },
      { status: 500 }
    )
  }
}

// POST - Start or update a workout session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, day_number, exercise_id, completed } = body

    if (!user_id || !day_number) {
      return NextResponse.json(
        { error: 'user_id and day_number are required' },
        { status: 400 }
      )
    }

    // Find or create today's session for this day
    const today = new Date().toISOString().split('T')[0]
    
    // Check if there's an incomplete session for this day
    const { data: existingSession } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user_id)
      .eq('day_number', day_number)
      .eq('is_complete', false)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    let session
    if (existingSession) {
      // Update existing session
      let exercisesCompleted = existingSession.exercises_completed || []
      
      if (completed && exercise_id && !exercisesCompleted.includes(exercise_id)) {
        exercisesCompleted = [...exercisesCompleted, exercise_id]
      } else if (!completed && exercise_id) {
        exercisesCompleted = exercisesCompleted.filter((id: string) => id !== exercise_id)
      }

      const { data: updatedData, error: updateError } = await supabase
        .from('workout_sessions')
        .update({
          exercises_completed: exercisesCompleted,
        })
        .eq('id', existingSession.id)
        .select()
        .single()

      if (updateError) throw updateError
      session = updatedData
    } else if (exercise_id) {
      // Create new session
      const exercisesCompleted = completed ? [exercise_id] : []
      
      const { data: newData, error: insertError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id,
          day_number,
          exercises_completed: exercisesCompleted,
          is_complete: false,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError
      session = newData
    } else {
      return NextResponse.json(
        { error: 'No session found or created' },
        { status: 400 }
      )
    }

    // Check if session is complete (all exercises for this day done)
    // First, get all exercises for this day in the sequence
    const { data: dayExercises } = await supabase
      .from('workout_sequences')
      .select('exercise_id')
      .eq('user_id', user_id)
      .eq('day_number', day_number)

    const totalExercises = dayExercises?.length || 0
    const completedExercises = session.exercises_completed?.length || 0

    if (totalExercises > 0 && completedExercises >= totalExercises && !session.is_complete) {
      // Mark session as complete
      const { data: completedSession, error: completeError } = await supabase
        .from('workout_sessions')
        .update({
          is_complete: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', session.id)
        .select()
        .single()

      if (completeError) throw completeError
      session = completedSession

      // Auto-advance user progress
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user_id)
        .single()

      if (progress) {
        // Get max day number in sequence to know when to cycle
        const { data: maxDayResult } = await supabase
          .from('workout_sequences')
          .select('day_number')
          .eq('user_id', user_id)
          .order('day_number', { ascending: false })
          .limit(1)

        const maxDay = maxDayResult?.[0]?.day_number || 1
        const nextDay = progress.current_day_number >= maxDay ? 1 : progress.current_day_number + 1

        await supabase
          .from('user_progress')
          .update({
            current_day_number: nextDay,
            last_workout_date: today,
            total_workouts_completed: progress.total_workouts_completed + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user_id)
      }
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error managing workout session:', error)
    return NextResponse.json(
      { error: 'Failed to manage workout session' },
      { status: 500 }
    )
  }
}
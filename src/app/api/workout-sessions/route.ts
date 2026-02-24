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
      .maybeSingle()

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

    // Note: Day advancement is now handled in check-out, not here
    // This keeps the session tracking separate from day progression

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error managing workout session:', error)
    return NextResponse.json(
      { error: 'Failed to manage workout session' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Fetch user's current progress
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // If no progress exists, create it
    if (!data) {
      const { data: newProgress, error: insertError } = await supabase
        .from('user_progress')
        .insert({
          user_id: userId,
          current_day_number: 1,
          total_workouts_completed: 0,
        })
        .select()
        .single()

      if (insertError) throw insertError
      return NextResponse.json(newProgress)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching user progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user progress' },
      { status: 500 }
    )
  }
}

// POST - Update user progress (advance to next day)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, advance_to_day } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('user_progress')
      .update({
        current_day_number: advance_to_day,
        last_workout_date: new Date().toISOString().split('T')[0],
        total_workouts_completed: supabase.raw('total_workouts_completed + 1'),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating user progress:', error)
    return NextResponse.json(
      { error: 'Failed to update user progress' },
      { status: 500 }
    )
  }
}
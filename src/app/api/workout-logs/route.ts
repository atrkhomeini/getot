import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Fetch workout logs for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const exerciseId = searchParams.get('exercise_id')
    const date = searchParams.get('date')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('workout_logs')
      .select(`
        *,
        exercises (name, category, gif_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (exerciseId) {
      query = query.eq('exercise_id', exerciseId)
    }

    if (date) {
      query = query.eq('date', date)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching workout logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workout logs' },
      { status: 500 }
    )
  }
}

// POST - Create a new workout log with per-set data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      user_id, 
      exercise_id, 
      actual_sets, 
      actual_reps, 
      weight, 
      date,
      sets_data 
    } = body

    // Validation
    if (!user_id || !exercise_id) {
      return NextResponse.json(
        { error: 'user_id and exercise_id are required' },
        { status: 400 }
      )
    }

    if (typeof actual_sets !== 'number' || typeof actual_reps !== 'number') {
      return NextResponse.json(
        { error: 'actual_sets and actual_reps must be numbers' },
        { status: 400 }
      )
    }

    // Validate sets_data structure if provided
    if (sets_data && !Array.isArray(sets_data)) {
      return NextResponse.json(
        { error: 'sets_data must be an array' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id,
        exercise_id,
        actual_sets,
        actual_reps,
        weight: weight || 0,
        date: date || new Date().toISOString().split('T')[0],
        sets_data: sets_data || [],
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating workout log:', error)
    return NextResponse.json(
      { error: 'Failed to create workout log' },
      { status: 500 }
    )
  }
}

// PUT - Update a workout log with per-set data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, actual_sets, actual_reps, weight, sets_data } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = {
      actual_sets,
      actual_reps,
      weight: weight || 0,
    }

    // Include sets_data if provided
    if (sets_data !== undefined) {
      updateData.sets_data = sets_data
    }

    const { data, error } = await supabase
      .from('workout_logs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating workout log:', error)
    return NextResponse.json(
      { error: 'Failed to update workout log' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a workout log
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('workout_logs')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting workout log:', error)
    return NextResponse.json(
      { error: 'Failed to delete workout log' },
      { status: 500 }
    )
  }
}
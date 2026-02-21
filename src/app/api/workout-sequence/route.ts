import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Fetch workout sequences for a user
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
      .from('workout_sequences')
      .select(`
        *,
        exercises (*)
      `)
      .eq('user_id', userId)
      .order('day_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (dayNumber) {
      query = query.eq('day_number', parseInt(dayNumber))
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching workout sequences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workout sequences' },
      { status: 500 }
    )
  }
}

// POST - Add exercise to sequence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, exercise_id, day_number, sort_order = 0 } = body

    if (!user_id || !exercise_id || day_number === undefined) {
      return NextResponse.json(
        { error: 'user_id, exercise_id, and day_number are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('workout_sequences')
      .insert({
        user_id,
        exercise_id,
        day_number,
        sort_order,
      })
      .select(`
        *,
        exercises (*)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error adding to sequence:', error)
    return NextResponse.json(
      { error: 'Failed to add to sequence' },
      { status: 500 }
    )
  }
}

// DELETE - Remove exercise from sequence
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
      .from('workout_sequences')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from sequence:', error)
    return NextResponse.json(
      { error: 'Failed to remove from sequence' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Fetch exercise requests (for admin)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const userId = searchParams.get('user_id')

    let query = supabase
      .from('exercise_requests')
      .select(`
        *,
        users (name, avatar_color),
        resolver:users!exercise_requests_resolved_by_fkey (name)
      `)
      .order('created_at', { ascending: false })

    if (status && (status === 'pending' || status === 'resolved')) {
      query = query.eq('status', status)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching exercise requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exercise requests' },
      { status: 500 }
    )
  }
}

// POST - Create new exercise request (for users)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, request_text } = body

    if (!user_id || !request_text) {
      return NextResponse.json(
        { error: 'user_id and request_text are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('exercise_requests')
      .insert({
        user_id,
        request_text,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating exercise request:', error)
    return NextResponse.json(
      { error: 'Failed to create exercise request' },
      { status: 500 }
    )
  }
}

// PUT - Update exercise request (resolve it)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, admin_notes, resolved_by } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = {}

    if (status) {
      updateData.status = status
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
        if (resolved_by) {
          updateData.resolved_by = resolved_by
        }
      }
    }

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    const { data, error } = await supabase
      .from('exercise_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating exercise request:', error)
    return NextResponse.json(
      { error: 'Failed to update exercise request' },
      { status: 500 }
    )
  }
}

// DELETE - Delete exercise request
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
      .from('exercise_requests')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting exercise request:', error)
    return NextResponse.json(
      { error: 'Failed to delete exercise request' },
      { status: 500 }
    )
  }
}
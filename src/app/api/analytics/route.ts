import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Fetch analytics data for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const category = searchParams.get('category')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Fetch workout logs with exercise details
    let query = supabase
      .from('workout_logs')
      .select(`
        *,
        exercises (
          id,
          name,
          category,
          target_sets,
          target_reps,
          target_weight
        )
      `)
      .eq('user_id', userId)
      .order('date', { ascending: true })

    const { data: logs, error } = await query

    if (error) throw error

    // Group by category
    const categoryData: Record<string, any[]> = {}
    const categoryProgress: Record<string, any> = {}

    logs?.forEach(log => {
      const exercise = log.exercises
      if (!exercise) return

      const cat = exercise.category

      if (!categoryData[cat]) {
        categoryData[cat] = []
      }

      categoryData[cat].push({
        date: log.date,
        exercise_id: log.exercise_id,
        exercise_name: exercise.name,
        actual_sets: log.actual_sets,
        actual_reps: log.actual_reps,
        weight: log.weight || 0,
        target_sets: exercise.target_sets,
        target_reps: exercise.target_reps,
        target_weight: exercise.target_weight || 0,
        volume: (log.actual_sets * log.actual_reps * (log.weight || 0)),
      })
    })

    // Calculate progress for each category
    Object.keys(categoryData).forEach(cat => {
      const catLogs = categoryData[cat]
      
      if (catLogs.length === 0) return

      // Sort by date
      catLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const firstLog = catLogs[0]
      const lastLog = catLogs[catLogs.length - 1]

      // Calculate average volume for first and last sessions
      const firstVolume = catLogs
        .filter(l => l.date === firstLog.date)
        .reduce((sum, l) => sum + l.volume, 0) / 
        catLogs.filter(l => l.date === firstLog.date).length

      const lastVolume = catLogs
        .filter(l => l.date === lastLog.date)
        .reduce((sum, l) => sum + l.volume, 0) / 
        catLogs.filter(l => l.date === lastLog.date).length

      // Calculate growth percentage
      const growth = firstVolume > 0 
        ? ((lastVolume - firstVolume) / firstVolume) * 100 
        : 0

      // Get total sessions
      const uniqueDates = [...new Set(catLogs.map(l => l.date))]

      categoryProgress[cat] = {
        category: cat,
        total_workouts: uniqueDates.length,
        first_workout_date: firstLog.date,
        last_workout_date: lastLog.date,
        avg_volume_start: Math.round(firstVolume),
        avg_volume_end: Math.round(lastVolume),
        growth_percentage: Math.round(growth),
        logs: catLogs,
      }
    })

    // Filter by category if specified
    if (category) {
      const filteredData = categoryProgress[category] || null
      return NextResponse.json(filteredData)
    }

    return NextResponse.json(categoryProgress)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
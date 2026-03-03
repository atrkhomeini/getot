import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type SetData = {
  set_number: number
  target_weight: number
  target_reps: number
  actual_weight: number
  actual_reps: number
  completed: boolean
  set_type: 'warmup' | 'normal' | 'failure'
}

// GET - Fetch analytics data for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const category = searchParams.get('category')
    const days = parseInt(searchParams.get('days') || '30')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

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
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    const { data: logs, error } = await query

    if (error) throw error

    // Process logs and calculate enhanced metrics
    const processedLogs = (logs || []).map(log => {
      const setsData: SetData[] = log.sets_data || []
      
      // Calculate metrics from sets_data
      const warmupSets = setsData.filter(s => s.set_type === 'warmup')
      const normalSets = setsData.filter(s => s.set_type === 'normal')
      const failureSets = setsData.filter(s => s.set_type === 'failure')
      const workingSets = setsData.filter(s => s.set_type !== 'warmup')

      // Working volume (exclude warmup)
      const workingVolume = workingSets.reduce(
        (sum, s) => sum + (s.actual_weight * s.actual_reps),
        0
      )

      // Total volume (includes warmup - for comparison)
      const totalVolume = setsData.reduce(
        (sum, s) => sum + (s.actual_weight * s.actual_reps),
        0
      )

      // Failure metrics
      const failureRate = setsData.length > 0
        ? (failureSets.length / setsData.length) * 100
        : 0

      // Intensity score (avg weight relative to target, working sets only)
      const avgWorkingWeight = workingSets.length > 0
        ? workingSets.reduce((sum, s) => sum + s.actual_weight, 0) / workingSets.length
        : 0

      const avgTargetWeight = workingSets.length > 0
        ? workingSets.reduce((sum, s) => sum + s.target_weight, 0) / workingSets.length
        : 0

      const intensityScore = avgTargetWeight > 0
        ? Math.min(100, (avgWorkingWeight / avgTargetWeight) * 100)
        : 0

      // Set type distribution
      const setDistribution = {
        warmup: warmupSets.length,
        normal: normalSets.length,
        failure: failureSets.length,
      }

      // Total reps
      const totalReps = setsData.reduce((sum, s) => sum + s.actual_reps, 0)
      const workingReps = workingSets.reduce((sum, s) => sum + s.actual_reps, 0)

      return {
        ...log,
        metrics: {
          workingVolume,
          totalVolume,
          failureRate,
          intensityScore,
          avgWorkingWeight,
          setDistribution,
          totalReps,
          workingReps,
          totalSets: setsData.length,
          workingSets: workingSets.length,
        }
      }
    })

    // Group by category
    const categoryData: Record<string, any[]> = {}
    const categoryProgress: Record<string, any> = {}

    processedLogs.forEach(log => {
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
        metrics: log.metrics,
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

      // Working volume growth (not total volume)
      const firstWorkingVolume = catLogs
        .filter(l => l.date === firstLog.date)
        .reduce((sum, l) => sum + (l.metrics?.workingVolume || 0), 0)

      const lastWorkingVolume = catLogs
        .filter(l => l.date === lastLog.date)
        .reduce((sum, l) => sum + (l.metrics?.workingVolume || 0), 0)

      const workingVolumeGrowth = firstWorkingVolume > 0
        ? ((lastWorkingVolume - firstWorkingVolume) / firstWorkingVolume) * 100
        : 0

      // Aggregate metrics
      const totalWorkingVolume = catLogs.reduce((sum, l) => sum + (l.metrics?.workingVolume || 0), 0)
      const avgFailureRate = catLogs.reduce((sum, l) => sum + (l.metrics?.failureRate || 0), 0) / catLogs.length
      const avgIntensity = catLogs.reduce((sum, l) => sum + (l.metrics?.intensityScore || 0), 0) / catLogs.length

      // Set type totals
      const setTotals = { warmup: 0, normal: 0, failure: 0 }
      catLogs.forEach(l => {
        if (l.metrics?.setDistribution) {
          setTotals.warmup += l.metrics.setDistribution.warmup
          setTotals.normal += l.metrics.setDistribution.normal
          setTotals.failure += l.metrics.setDistribution.failure
        }
      })

      // Get unique dates
      const uniqueDates = [...new Set(catLogs.map(l => l.date))]

      // Find max weight
      const maxWeight = Math.max(...catLogs.map(l => l.weight || 0), 0)

      categoryProgress[cat] = {
        category: cat,
        total_workouts: uniqueDates.length,
        first_workout_date: firstLog.date,
        last_workout_date: lastLog.date,
        
        // Enhanced metrics
        working_volume: totalWorkingVolume,
        working_volume_growth: Math.round(workingVolumeGrowth),
        avg_failure_rate: Math.round(avgFailureRate * 10) / 10,
        avg_intensity: Math.round(avgIntensity),
        max_weight: maxWeight,
        
        // Set distribution
        set_totals: setTotals,
        
        logs: catLogs,
      }
    })

    // Calculate overall summary
    const summary = {
      totalWorkingVolume: processedLogs.reduce((sum, l) => sum + (l.metrics?.workingVolume || 0), 0),
      totalVolume: processedLogs.reduce((sum, l) => sum + (l.metrics?.totalVolume || 0), 0),
      avgFailureRate: processedLogs.reduce((sum, l) => sum + (l.metrics?.failureRate || 0), 0) / Math.max(1, processedLogs.length),
      avgIntensity: processedLogs.reduce((sum, l) => sum + (l.metrics?.intensityScore || 0), 0) / Math.max(1, processedLogs.length),
      setTotals: {
        warmup: processedLogs.reduce((sum, l) => sum + (l.metrics?.setDistribution?.warmup || 0), 0),
        normal: processedLogs.reduce((sum, l) => sum + (l.metrics?.setDistribution?.normal || 0), 0),
        failure: processedLogs.reduce((sum, l) => sum + (l.metrics?.setDistribution?.failure || 0), 0),
      },
      totalSets: processedLogs.reduce((sum, l) => sum + (l.metrics?.totalSets || 0), 0),
      workingSets: processedLogs.reduce((sum, l) => sum + (l.metrics?.workingSets || 0), 0),
    }

    // Filter by category if specified
    if (category) {
      const filteredData = categoryProgress[category] || null
      return NextResponse.json({
        category: filteredData,
        summary,
      })
    }

    return NextResponse.json({
      categories: categoryProgress,
      summary,
      logs: processedLogs,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
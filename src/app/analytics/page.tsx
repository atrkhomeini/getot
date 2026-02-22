'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import UserLayout from '@/components/user-layout'
import { useAppStore } from '@/lib/store'
import { BarChart3, TrendingUp, Calendar, Flame, Clock, ArrowRight, ArrowDown, ArrowUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Exercise = Database['public']['Tables']['exercises']['Row']
type WorkoutLog = Database['public']['Tables']['workout_logs']['Row']
type CheckIn = Database['public']['Tables']['check_ins']['Row']

const categoryColors: Record<string, string> = {
  back: 'var(--secondary)',
  chest: 'var(--primary)',
  shoulder: 'var(--accent)',
  leg: 'var(--muted)',
  arm: '#FF6B6B',
}

const categoryIcons: Record<string, string> = {
  back: '🏋️',
  chest: '💪',
  shoulder: '🎯',
  leg: '🦵',
  arm: '💪',
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { currentUser } = useAppStore()
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryAnalytics, setCategoryAnalytics] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }
    fetchData()
  }, [currentUser, router])

  const fetchData = async () => {
    if (!currentUser) return

    try {
      // Fetch workout logs
      const { data: logs, error: logsError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: true })

      if (logsError) throw logsError

      // Fetch check-ins
      const { data: ci, error: ciError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('check_in_time', { ascending: true })

      if (ciError) throw ciError

      // Fetch exercises
      const { data: ex, error: exError } = await supabase
        .from('exercises')
        .select('*')

      if (exError) throw exError

      setWorkoutLogs(logs || [])
      setCheckIns(ci || [])
      setExercises(ex || [])

      // Calculate category analytics
      calculateCategoryAnalytics(logs || [], ex || [])
    } catch (err) {
      console.error('Error fetching analytics data:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateCategoryAnalytics = (logs: WorkoutLog[], exerciseList: Exercise[]) => {
    const categoryData: Record<string, any[]> = {}
    const categoryProgress: Record<string, any> = {}

    logs.forEach(log => {
      const exercise = exerciseList.find(ex => ex.id === log.exercise_id)
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
        Math.max(1, catLogs.filter(l => l.date === firstLog.date).length)

      const lastVolume = catLogs
        .filter(l => l.date === lastLog.date)
        .reduce((sum, l) => sum + l.volume, 0) / 
        Math.max(1, catLogs.filter(l => l.date === lastLog.date).length)

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

    setCategoryAnalytics(categoryProgress)
  }

  const calculateSimpleMetrics = (logs: any[]) => {
    if (logs.length === 0) return null

    // Get latest workout logs
    const latestDate = logs[logs.length - 1].date
    const latestLogs = logs.filter(l => l.date === latestDate)

    if (latestLogs.length === 0) return null

    // Max weight lifted
    const maxWeight = Math.max(...latestLogs.map(l => l.weight || 0), 0)

    // Total reps in latest session
    const totalReps = latestLogs.reduce((sum, l) => sum + (l.actual_sets * l.actual_reps), 0)

    // Average sets and reps
    const avgSets = Math.round(latestLogs.reduce((sum, l) => sum + l.actual_sets, 0) / latestLogs.length)
    const avgReps = Math.round(latestLogs.reduce((sum, l) => sum + l.actual_reps, 0) / latestLogs.length)

    // Total exercises
    const totalExercises = logs.length

    return {
      maxWeight,
      totalReps,
      avgSets,
      avgReps,
      totalExercises,
    }
  }

  // Get last 7 days or 30 days data
  const getChartData = () => {
    const days = selectedPeriod === 'week' ? 7 : 30
    const data = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayLogs = workoutLogs.filter((log) => log.date === dateStr)
      
      // Filter by selected category if any
      const filteredLogs = selectedCategory
        ? dayLogs.filter(log => {
            const exercise = exercises.find(ex => ex.id === log.exercise_id)
            return exercise?.category === selectedCategory
          })
        : dayLogs

      const totalActual = filteredLogs.reduce((sum, log) => sum + log.actual_sets * log.actual_reps, 0)
      const totalTarget = filteredLogs.reduce((sum, log) => {
        const exercise = exercises.find((ex) => ex.id === log.exercise_id)
        return sum + (exercise?.target_sets || 0) * (exercise?.target_reps || 0)
      }, 0)

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actual: totalActual,
        target: totalTarget,
      })
    }

    return data
  }

  // GitHub-style consistency graph
  const getConsistencyData = () => {
    const weeks = 12
    const data = []

    for (let week = 0; week < weeks; week++) {
      const weekData = []
      for (let day = 0; day < 7; day++) {
        const date = new Date()
        date.setDate(date.getDate() - ((weeks - 1 - week) * 7 + (6 - day)))
        const dateStr = date.toISOString().split('T')[0]

        let hasWorkout = workoutLogs.some((log) => log.date === dateStr)
        
        // Filter by selected category if any
        if (selectedCategory) {
          hasWorkout = workoutLogs.some((log) => {
            if (log.date !== dateStr) return false
            const exercise = exercises.find(ex => ex.id === log.exercise_id)
            return exercise?.category === selectedCategory
          })
        }
        
        const hasCheckIn = checkIns.some((ci) => ci.check_in_time.startsWith(dateStr))

        let level = 0
        if (hasCheckIn && hasWorkout) level = 4
        else if (hasCheckIn) level = 3
        else if (hasWorkout) level = 2

        weekData.push({
          date: dateStr,
          day: day,
          level,
        })
      }
      data.push(weekData)
    }

    return data
  }

  // Calculate stats
  const getStats = () => {
    const totalWorkouts = checkIns.length
    const totalDuration = checkIns.reduce((sum, ci) => sum + (ci.duration_minutes || 0), 0)
    const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0
    const totalExercises = workoutLogs.length
    const totalReps = workoutLogs.reduce((sum, log) => sum + log.actual_sets * log.actual_reps, 0)

    // Current streak
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const hasWorkout = workoutLogs.some((log) => log.date === dateStr)
      if (hasWorkout) {
        streak++
      } else if (i > 0) {
        break
      }
    }

    return {
      totalWorkouts,
      totalDuration,
      avgDuration,
      totalExercises,
      totalReps,
      streak,
    }
  }

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-foreground">Loading analytics...</div>
        </div>
      </UserLayout>
    )
  }

  const chartData = getChartData()
  const consistencyData = getConsistencyData()
  const stats = getStats()
  const categories = Object.keys(categoryAnalytics)

  const levelColors = [
    'bg-muted',
    'bg-secondary/30',
    'bg-secondary/60',
    'bg-secondary',
    'bg-primary',
  ]

  const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <UserLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Analytics
            </h1>
            <p className="font-mono text-muted-foreground">
              {selectedCategory 
                ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Progress` 
                : 'Track your progress and consistency'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
                selectedPeriod === 'week'
                  ? 'neo-button bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
                selectedPeriod === 'month'
                  ? 'neo-button bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Month
            </button>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-4 py-2 rounded-lg font-mono text-sm font-bold bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <BarChart3 className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats.totalWorkouts}</p>
            <p className="font-mono text-xs text-muted-foreground">Workouts</p>
          </div>
          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-secondary" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats.avgDuration}m</p>
            <p className="font-mono text-xs text-muted-foreground">Avg Duration</p>
          </div>
          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats.streak}</p>
            <p className="font-mono text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <Flame className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats.totalExercises}</p>
            <p className="font-mono text-xs text-muted-foreground">Exercises</p>
          </div>
          <div className="neo-card bg-card rounded-xl p-4 text-center col-span-2">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats.totalReps}</p>
            <p className="font-mono text-xs text-muted-foreground">Total Reps</p>
          </div>
        </div>

        {/* Category Progress Cards - NEW SECTION */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Progress by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map(category => {
              const data = categoryAnalytics[category]
              const simpleMetrics = calculateSimpleMetrics(data.logs)
              const isPositive = data.growth_percentage >= 0

              if (!simpleMetrics) return null

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`neo-card bg-card rounded-xl p-4 text-left transition-all ${
                    selectedCategory === category ? 'border-2 border-primary' : 'border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{categoryIcons[category] || '💪'}</span>
                    <h3 className="font-bold text-foreground capitalize">{category}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Max Weight - MORE RELATABLE */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Max Weight</span>
                      <span className="font-mono font-bold text-foreground">
                        {simpleMetrics.maxWeight > 0 ? `${simpleMetrics.maxWeight}kg` : '-'}
                      </span>
                    </div>
                    
                    {/* Growth Percentage - KEPT */}
                    <div className={`flex items-center gap-1 text-sm font-mono ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                      <span className="font-bold">
                        {isPositive ? '+' : ''}{data.growth_percentage}%
                      </span>
                    </div>
                    
                    {/* Average Sets × Reps - FAMILIAR FORMAT */}
                    <div className="text-xs text-muted-foreground">
                      Avg: {simpleMetrics.avgSets} × {simpleMetrics.avgReps}
                    </div>

                    {/* Total Reps - SIMPLE COUNT */}
                    <div className="text-xs text-muted-foreground">
                      {simpleMetrics.totalReps} reps today
                    </div>

                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, data.growth_percentage + 50))}%`,
                          backgroundColor: categoryColors[category],
                        }}
                      />
                    </div>
                  </div>
                </button>
              )
            })}

            {categories.length === 0 && (
              <div className="col-span-2 md:col-span-3 lg:col-span-5 text-center py-8 text-muted-foreground font-mono text-sm">
                Complete some workouts to see category progress
              </div>
            )}
          </div>
        </div>

        {/* Performance Chart */}
        <div className="neo-card bg-card rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">
              Performance: Actual vs Target
              {selectedCategory && ` (${selectedCategory})`}
            </h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--foreground)"
                  style={{ fontSize: '12px', fontFamily: 'Consolas, monospace' }}
                />
                <YAxis
                  stroke="var(--foreground)"
                  style={{ fontSize: '12px', fontFamily: 'Consolas, monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '2px solid var(--border)',
                    borderRadius: '8px',
                    fontFamily: 'Consolas, monospace',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4 }}
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="var(--secondary)"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: 'var(--secondary)', strokeWidth: 2, r: 4 }}
                  name="Target"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GitHub-style Consistency Graph */}
        <div className="neo-card bg-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Consistency Graph (Last 12 Weeks)
            {selectedCategory && ` - ${selectedCategory}`}
          </h2>
          <div className="flex gap-1 flex-wrap">
            {consistencyData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`w-4 h-4 rounded-sm ${levelColors[day.level]} transition-all hover:scale-125 cursor-pointer`}
                    title={`${day.date}: ${
                      day.level === 4 ? 'Full workout' : day.level === 3 ? 'Checked in' : day.level === 2 ? 'Workout only' : 'No activity'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 mt-4 text-xs font-mono text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {levelColors.map((color, index) => (
                <div key={index} className={`w-3 h-3 rounded-sm ${color}`} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Detailed Category View */}
        {selectedCategory && categoryAnalytics[selectedCategory] && (
          <div className="neo-card bg-card rounded-2xl p-6 mt-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{categoryIcons[selectedCategory]}</span>
              <div>
                <h2 className="text-2xl font-bold text-foreground capitalize">
                  {selectedCategory} Detailed Progress
                </h2>
                <p className="font-mono text-muted-foreground text-sm">
                  {categoryAnalytics[selectedCategory].total_workouts} workouts completed
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {/* Max Weight - MORE RELATABLE */}
              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Max Weight</span>
                </div>
                <p className="text-3xl font-bold text-foreground font-mono">
                  {(() => {
                    const metrics = calculateSimpleMetrics(categoryAnalytics[selectedCategory].logs)
                    return metrics ? `${metrics.maxWeight}kg` : '-'
                  })()}
                </p>
              </div>

              {/* Total Reps - SIMPLE COUNT */}
              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Reps</span>
                </div>
                <p className="text-3xl font-bold text-foreground font-mono">
                  {(() => {
                    const metrics = calculateSimpleMetrics(categoryAnalytics[selectedCategory].logs)
                    return metrics ? metrics.totalReps.toLocaleString() : '-'
                  })()}
                </p>
              </div>

              {/* Avg Sets - FAMILIAR */}
              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Avg Sets</span>
                </div>
                <p className="text-3xl font-bold text-foreground font-mono">
                  {(() => {
                    const metrics = calculateSimpleMetrics(categoryAnalytics[selectedCategory].logs)
                    return metrics ? metrics.avgSets : '-'
                  })()}
                </p>
              </div>

              {/* Avg Reps - FAMILIAR */}
              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Avg Reps</span>
                </div>
                <p className="text-3xl font-bold text-foreground font-mono">
                  {(() => {
                    const metrics = calculateSimpleMetrics(categoryAnalytics[selectedCategory].logs)
                    return metrics ? metrics.avgReps : '-'
                  })()}
                </p>
              </div>
            </div>

            <h3 className="font-bold text-foreground mb-4">Recent Workouts</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...categoryAnalytics[selectedCategory].logs]
                .reverse()
                .slice(0, 10)
                .map((log: any, index: number) => (
                  <div
                    key={`${log.date}-${log.exercise_id}-${index}`}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-bold text-foreground text-sm">{log.exercise_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {log.actual_sets} × {log.actual_reps} @ {log.weight}kg
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-foreground text-sm">
                        {log.weight}kg
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            <button
              onClick={() => setSelectedCategory(null)}
              className="mt-6 w-full py-2 rounded-lg bg-muted hover:bg-muted/80 font-mono text-sm transition-colors"
            >
              Close Details
            </button>
          </div>
        )}
      </div>
    </UserLayout>
  )
}
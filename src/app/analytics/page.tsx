'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import UserLayout from '@/components/user-layout'
import { useAppStore } from '@/lib/store'
import { BarChart3, TrendingUp, Calendar, Flame, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Exercise = Database['public']['Tables']['exercises']['Row']
type WorkoutLog = Database['public']['Tables']['workout_logs']['Row']
type CheckIn = Database['public']['Tables']['check_ins']['Row']

export default function AnalyticsPage() {
  const router = useRouter()
  const { currentUser } = useAppStore()
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')

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
    } catch (err) {
      console.error('Error fetching analytics data:', err)
    } finally {
      setLoading(false)
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
      const totalActual = dayLogs.reduce((sum, log) => sum + log.actual_sets * log.actual_reps, 0)
      const totalTarget = dayLogs.reduce((sum, log) => {
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

        const hasWorkout = workoutLogs.some((log) => log.date === dateStr)
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Analytics
            </h1>
            <p className="font-mono text-muted-foreground">
              Track your progress and consistency
            </p>
          </div>
          <div className="flex gap-2">
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

        {/* Performance Chart */}
        <div className="neo-card bg-card rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Performance: Actual vs Target</h2>
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
          <h2 className="text-xl font-bold text-foreground mb-4">Consistency Graph (Last 12 Weeks)</h2>
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
      </div>
    </UserLayout>
  )
}

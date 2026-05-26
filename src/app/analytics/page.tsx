'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import UserLayout from '@/components/user-layout'
import { useAppStore } from '@/lib/store'
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Flame, 
  Clock, 
  ArrowRight, 
  ArrowDown, 
  ArrowUp,
  Sun,
  Target,
  Activity
} from 'lucide-react'
import { LineChart, Line, XAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from '@/lib/utils'

type Exercise = Database['public']['Tables']['exercises']['Row']
type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'] & {
  metrics?: {
    workingVolume: number
    totalVolume: number
    failureRate: number
    intensityScore: number
    avgWorkingWeight: number
    setDistribution: { warmup: number; normal: number; failure: number }
    totalReps: number
    workingReps: number
    totalSets: number
    workingSets: number
  }
}
type CheckIn = Database['public']['Tables']['check_ins']['Row']

type SetData = {
  set_number: number
  target_weight: number
  target_reps: number
  actual_weight: number
  actual_reps: number
  completed: boolean
  set_type: 'warmup' | 'normal' | 'failure'
}

const categoryColors: Record<string, string> = {
  back: 'var(--secondary)',
  chest: 'var(--primary)',
  shoulder: 'var(--accent)',
  leg: 'var(--muted)',
  arm: '#FF6B6B',
  core: '#06B6D4',
}

const categoryIcons: Record<string, string> = {
  back: '/icons/back.png',
  chest: '/icons/chest.png',
  shoulder: '/icons/shoulder.png',
  leg: '/icons/leg.png',
  arm: '/icons/arm.png',
  core: '/icons/core.png',
}

const SET_TYPE_COLORS = {
  warmup: '#EAB308',
  normal: '#6B7280',
  failure: '#EF4444',
}

const volumeChartConfig = {
  volume: {
    label: "Volume",
  },
  workingVolume: {
    label: "Working Volume",
    color: "#22C55E",
  },
  totalVolume: {
    label: "Total Volume",
    color: "#6B7280",
  },
} satisfies ChartConfig

export default function AnalyticsPage() {
  const router = useRouter()
  const { currentUser } = useAppStore()
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryAnalytics, setCategoryAnalytics] = useState<Record<string, any>>({})
  const [summaryMetrics, setSummaryMetrics] = useState<any>(null)
  const [activeChart, setActiveChart] = useState<"workingVolume" | "totalVolume">("workingVolume")

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }
    fetchData()
  }, [currentUser, router, selectedPeriod])

  useEffect(() => {
    if (workoutLogs.length > 0) {
      calculateEnhancedAnalytics()
    }
  }, [workoutLogs, selectedPeriod])

  const fetchData = async () => {
    if (!currentUser) return

    try {
      const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : null

      let logsQuery = supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', currentUser.id)

      if (days) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        logsQuery = logsQuery.gte('date', startDate.toISOString().split('T')[0])
      }

      const { data: logs, error: logsError } = await logsQuery.order('date', { ascending: true })

      if (logsError) throw logsError

      const processedLogs = (logs || []).map(log => {
        const setsData: SetData[] = (log.sets_data || []) as SetData[]
        
        const warmupSets = setsData.filter(s => s.set_type === 'warmup')
        const normalSets = setsData.filter(s => s.set_type === 'normal')
        const failureSets = setsData.filter(s => s.set_type === 'failure')
        const workingSets = setsData.filter(s => s.set_type !== 'warmup')

        const workingVolume = workingSets.reduce(
          (sum, s) => sum + (s.actual_weight * s.actual_reps),
          0
        )

        const totalVolume = setsData.reduce(
          (sum, s) => sum + (s.actual_weight * s.actual_reps),
          0
        )

        const failureRate = setsData.length > 0
          ? (failureSets.length / setsData.length) * 100
          : 0

        const avgWorkingWeight = workingSets.length > 0
          ? workingSets.reduce((sum, s) => sum + s.actual_weight, 0) / workingSets.length
          : 0

        const avgTargetWeight = workingSets.length > 0
          ? workingSets.reduce((sum, s) => sum + s.target_weight, 0) / workingSets.length
          : 0

        const intensityScore = avgTargetWeight > 0
          ? Math.min(100, (avgWorkingWeight / avgTargetWeight) * 100)
          : 0

        const setDistribution = {
          warmup: warmupSets.length,
          normal: normalSets.length,
          failure: failureSets.length,
        }

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

      const { data: ci, error: ciError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('check_in_time', { ascending: true })

      if (ciError) throw ciError

      const { data: ex, error: exError } = await supabase
        .from('exercises')
        .select('*')

      if (exError) throw exError

      setWorkoutLogs(processedLogs)
      setCheckIns(ci || [])
      setExercises(ex || [])
    } catch (err) {
      console.error('Error fetching analytics data:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateEnhancedAnalytics = () => {
    if (workoutLogs.length === 0) return

    const categoryData: Record<string, any[]> = {}

    workoutLogs.forEach(log => {
      const exercise = exercises.find(ex => ex.id === log.exercise_id)
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

    const categoryProgress: Record<string, any> = {}

    Object.keys(categoryData).forEach(cat => {
      const catLogs = categoryData[cat]
      
      if (catLogs.length === 0) return

      catLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const firstLog = catLogs[0]
      const lastLog = catLogs[catLogs.length - 1]

      const firstWorkingVolume = catLogs
        .filter(l => l.date === firstLog.date)
        .reduce((sum, l) => sum + (l.metrics?.workingVolume || 0), 0)

      const lastWorkingVolume = catLogs
        .filter(l => l.date === lastLog.date)
        .reduce((sum, l) => sum + (l.metrics?.workingVolume || 0), 0)

      const workingVolumeGrowth = firstWorkingVolume > 0
        ? ((lastWorkingVolume - firstWorkingVolume) / firstWorkingVolume) * 100
        : 0

      const totalWorkingVolume = catLogs.reduce((sum, l) => sum + (l.metrics?.workingVolume || 0), 0)
      const avgFailureRate = catLogs.reduce((sum, l) => sum + (l.metrics?.failureRate || 0), 0) / catLogs.length
      const avgIntensity = catLogs.reduce((sum, l) => sum + (l.metrics?.intensityScore || 0), 0) / catLogs.length

      const setTotals = { warmup: 0, normal: 0, failure: 0 }
      catLogs.forEach(l => {
        if (l.metrics?.setDistribution) {
          setTotals.warmup += l.metrics.setDistribution.warmup
          setTotals.normal += l.metrics.setDistribution.normal
          setTotals.failure += l.metrics.setDistribution.failure
        }
      })

      const uniqueDates = [...new Set(catLogs.map(l => l.date))]
      const maxWeight = Math.max(...catLogs.map(l => l.weight || 0), 0)

      categoryProgress[cat] = {
        category: cat,
        total_workouts: uniqueDates.length,
        first_workout_date: firstLog.date,
        last_workout_date: lastLog.date,
        working_volume: totalWorkingVolume,
        working_volume_growth: Math.round(workingVolumeGrowth),
        avg_failure_rate: Math.round(avgFailureRate * 10) / 10,
        avg_intensity: Math.round(avgIntensity),
        max_weight: maxWeight,
        set_totals: setTotals,
        logs: catLogs,
      }
    })

    setCategoryAnalytics(categoryProgress)

    const summary = {
      totalWorkingVolume: workoutLogs.reduce((sum, l) => sum + (l.metrics?.workingVolume || 0), 0),
      totalVolume: workoutLogs.reduce((sum, l) => sum + (l.metrics?.totalVolume || 0), 0),
      avgFailureRate: workoutLogs.reduce((sum, l) => sum + (l.metrics?.failureRate || 0), 0) / Math.max(1, workoutLogs.length),
      avgIntensity: workoutLogs.reduce((sum, l) => sum + (l.metrics?.intensityScore || 0), 0) / Math.max(1, workoutLogs.length),
      setTotals: {
        warmup: workoutLogs.reduce((sum, l) => sum + (l.metrics?.setDistribution?.warmup || 0), 0),
        normal: workoutLogs.reduce((sum, l) => sum + (l.metrics?.setDistribution?.normal || 0), 0),
        failure: workoutLogs.reduce((sum, l) => sum + (l.metrics?.setDistribution?.failure || 0), 0),
      },
      totalSets: workoutLogs.reduce((sum, l) => sum + (l.metrics?.totalSets || 0), 0),
      workingSets: workoutLogs.reduce((sum, l) => sum + (l.metrics?.workingSets || 0), 0),
    }

    setSummaryMetrics(summary)
  }

  const getChartData = () => {
    if (selectedPeriod === 'all') {
      const dateMap: Record<string, { workingVolume: number; totalVolume: number; reps: number }> = {}

      workoutLogs.forEach(log => {
        const exercise = exercises.find(ex => ex.id === log.exercise_id)
        if (selectedCategory && exercise?.category !== selectedCategory) return

        if (!dateMap[log.date]) {
          dateMap[log.date] = { workingVolume: 0, totalVolume: 0, reps: 0 }
        }
        dateMap[log.date].workingVolume += log.metrics?.workingVolume || 0
        dateMap[log.date].totalVolume += log.metrics?.totalVolume || 0
        dateMap[log.date].reps += log.metrics?.workingReps || 0
      })

      return Object.entries(dateMap)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([dateStr, values]) => ({
          date: new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ...values,
        }))
    }

    const days = selectedPeriod === 'week' ? 7 : 30
    const data = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayLogs = workoutLogs.filter((log) => log.date === dateStr)
      
      const filteredLogs = selectedCategory
        ? dayLogs.filter(log => {
            const exercise = exercises.find(ex => ex.id === log.exercise_id)
            return exercise?.category === selectedCategory
          })
        : dayLogs

      const workingVolume = filteredLogs.reduce(
        (sum, log) => sum + (log.metrics?.workingVolume || 0),
        0
      )

      const totalVolume = filteredLogs.reduce(
        (sum, log) => sum + (log.metrics?.totalVolume || 0),
        0
      )

      const totalReps = filteredLogs.reduce((sum, log) => sum + (log.metrics?.workingReps || 0), 0)

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        workingVolume,
        totalVolume,
        reps: totalReps,
      })
    }

    return data
  }

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

  const getStats = () => {
    const totalWorkouts = checkIns.length
    const totalDuration = checkIns.reduce((sum, ci) => sum + (ci.duration_minutes || 0), 0)
    const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0

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
      streak,
    }
  }

  // Moved above the early return to prevent Rules of Hooks violation
  const chartData = getChartData()
  const volumeTotals = useMemo(() => ({
    workingVolume: chartData.reduce((acc, curr) => acc + (curr.workingVolume || 0), 0),
    totalVolume: chartData.reduce((acc, curr) => acc + (curr.totalVolume || 0), 0),
  }), [chartData])

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-foreground">Loading analytics...</div>
        </div>
      </UserLayout>
    )
  }

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

  const pieData = summaryMetrics ? [
    { name: 'Warm-up', value: summaryMetrics.setTotals.warmup, color: SET_TYPE_COLORS.warmup },
    { name: 'Normal', value: summaryMetrics.setTotals.normal, color: SET_TYPE_COLORS.normal },
    { name: 'Failure', value: summaryMetrics.setTotals.failure, color: SET_TYPE_COLORS.failure },
  ] : []

  return (
    <UserLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Enhanced Analytics
            </h1>
            <p className="font-mono text-muted-foreground">
              {selectedCategory 
                ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Progress` 
                : 'Working volume excludes warm-up sets'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedPeriod('week')}
              className={cn(
                "px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all",
                selectedPeriod === 'week'
                  ? "neo-button bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={cn(
                "px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all",
                selectedPeriod === 'month'
                  ? "neo-button bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Month
            </button>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={cn(
                "px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all",
                selectedPeriod === 'all'
                  ? "neo-button bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              All Time
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

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="neo-card bg-card rounded-xl p-4 text-center col-span-2">
            <Activity className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="font-mono text-3xl font-bold text-foreground">
              {summaryMetrics?.totalWorkingVolume?.toLocaleString() || 0}
              <span className="text-sm ml-1">kg</span>
            </p>
            <p className="font-mono text-xs text-muted-foreground">Working Volume</p>
            <p className="font-mono text-[10px] text-green-600 mt-1">Excludes warm-up</p>
          </div>

          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <Flame className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="font-mono text-2xl font-bold text-foreground">
              {summaryMetrics?.avgFailureRate?.toFixed(1) || 0}%
            </p>
            <p className="font-mono text-xs text-muted-foreground">Failure Rate</p>
          </div>

          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-secondary" />
            <p className="font-mono text-2xl font-bold text-foreground">
              {summaryMetrics?.avgIntensity?.toFixed(0) || 0}%
            </p>
            <p className="font-mono text-xs text-muted-foreground">Intensity</p>
          </div>

          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats.streak}</p>
            <p className="font-mono text-xs text-muted-foreground">Day Streak</p>
          </div>

          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <BarChart3 className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats.totalWorkouts}</p>
            <p className="font-mono text-xs text-muted-foreground">Workouts</p>
          </div>
        </div>

        {/* Set Type Distribution + Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="neo-card bg-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Set Type Distribution
            </h2>
            
            {summaryMetrics && summaryMetrics.totalSets > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value} sets`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: SET_TYPE_COLORS.warmup }} />
                    <span className="text-xs font-mono text-muted-foreground">
                      W: {summaryMetrics.setTotals.warmup}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: SET_TYPE_COLORS.normal }} />
                    <span className="text-xs font-mono text-muted-foreground">
                      N: {summaryMetrics.setTotals.normal}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: SET_TYPE_COLORS.failure }} />
                    <span className="text-xs font-mono text-muted-foreground">
                      F: {summaryMetrics.setTotals.failure}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-mono text-center text-muted-foreground">
                    {summaryMetrics.totalSets} total sets • {summaryMetrics.workingSets} working sets
                  </p>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="font-mono text-muted-foreground text-sm">No data yet</p>
              </div>
            )}
          </div>

          <div className="neo-card bg-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Volume Comparison</h2>
            
            {summaryMetrics && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-mono text-muted-foreground">Working Volume</span>
                    <span className="text-sm font-mono font-bold text-green-600">
                      {summaryMetrics.totalWorkingVolume.toLocaleString()} kg
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500"
                      style={{ 
                        width: `${Math.min(100, (summaryMetrics.totalWorkingVolume / Math.max(1, summaryMetrics.totalVolume)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-mono text-muted-foreground">Total Volume</span>
                    <span className="text-sm font-mono font-bold text-muted-foreground">
                      {summaryMetrics.totalVolume.toLocaleString()} kg
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-muted-foreground/30 w-full" />
                  </div>
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs font-mono text-yellow-600">
                      Warm-up sets: {(summaryMetrics.totalVolume - summaryMetrics.totalWorkingVolume).toLocaleString()} kg
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">
                    Not counted in working volume
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Category Progress Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Progress by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map(category => {
              const data = categoryAnalytics[category]
              if (!data) return null

              const isPositive = data.working_volume_growth >= 0

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "neo-card bg-card rounded-xl p-4 text-left transition-all",
                    selectedCategory === category 
                      ? "border-2 border-primary" 
                      : "border-2 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      <img 
                        src={categoryIcons[category]} 
                        alt={category}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                    <h3 className="font-bold text-foreground capitalize text-sm">{category}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Working Vol</span>
                      <span className="font-mono font-bold text-foreground">
                        {data.working_volume?.toLocaleString() || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Max Weight</span>
                      <span className="font-mono font-bold text-foreground">
                        {data.max_weight || 0}kg
                      </span>
                    </div>
                    
                    <div className={cn(
                      "flex items-center gap-1 text-xs font-mono",
                      isPositive ? "text-green-600" : "text-red-600"
                    )}>
                      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      <span className="font-bold">
                        {isPositive ? '+' : ''}{data.working_volume_growth}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Failure Rate</span>
                      <span className="font-mono text-red-500">
                        {data.avg_failure_rate?.toFixed(1) || 0}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Intensity</span>
                      <span className="font-mono text-secondary">
                        {data.avg_intensity?.toFixed(0) || 0}%
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, data.avg_intensity || 0))}%`,
                          backgroundColor: categoryColors[category],
                        }}
                      />
                    </div>
                  </div>
                </button>
              )
            })}

            {categories.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground font-mono text-sm">
                Complete some workouts to see category progress
              </div>
            )}
          </div>
        </div>

        {/* Performance Chart — Interactive */}
        <div className="neo-card bg-card rounded-2xl overflow-hidden mb-8">
          <div className="flex flex-col items-stretch sm:flex-row border-b-2 border-b-border">
            <div className="flex flex-1 flex-col justify-center gap-1 py-4 px-6">
              <h2 className="text-xl font-bold text-foreground">
                Volume Over Time
                {selectedCategory && ` (${selectedCategory})`}
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Tap to toggle view
              </p>
            </div>
            <div className="flex">
              {(["workingVolume", "totalVolume"] as const).map((key) => {
                const config = volumeChartConfig[key]
                return (
                  <button
                    key={key}
                    data-active={activeChart === key}
                    className={cn(
                      "relative z-10 flex flex-1 flex-col justify-center gap-1 px-6 py-4 text-left font-mono transition-colors",
                      "border-l-2 border-l-border first:border-l-0",
                      "data-[active=true]:bg-[var(--color-workingVolume)] even:data-[active=true]:bg-[var(--color-totalVolume)]",
                      "data-[active=true]:text-white text-foreground"
                    )}
                    onClick={() => setActiveChart(key)}
                  >
                    <span className="text-xs data-[active=true]:text-white/80 text-muted-foreground">
                      {config.label}
                    </span>
                    <span className="text-lg leading-none font-bold sm:text-2xl">
                      {volumeTotals[key].toLocaleString()} kg
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <ChartContainer
              config={volumeChartConfig}
              className={cn(
                "aspect-auto h-[250px] w-full",
                activeChart === "workingVolume" &&
                  "[&_.recharts-layer_path]:stroke-[var(--color-workingVolume)]",
                activeChart === "totalVolume" &&
                  "[&_.recharts-layer_path]:stroke-[var(--color-totalVolume)]",
              )}
            >
              <LineChart
                accessibilityLayer
                data={chartData}
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  style={{ fontSize: '12px', fontFamily: 'Consolas, monospace' }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[180px] font-mono"
                      nameKey="volume"
                      formatter={(value: number, name: string) => (
                        <div className="flex min-w-[130px] items-center justify-between gap-4">
                          <span className="text-muted-foreground capitalize">{name}</span>
                          <span className="font-mono font-bold text-foreground">{value.toLocaleString()} kg</span>
                        </div>
                      )}
                    />
                  }
                />
                <Line
                  dataKey={activeChart}
                  type="monotone"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
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
                    className={cn("w-4 h-4 rounded-sm transition-all hover:scale-125 cursor-pointer", levelColors[day.level])}
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
                <div key={index} className={cn("w-3 h-3 rounded-sm", color)} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Detailed Category View */}
        {selectedCategory && categoryAnalytics[selectedCategory] && (
          <div className="neo-card bg-card rounded-2xl p-6 mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img 
                  src={categoryIcons[selectedCategory]} 
                  alt={selectedCategory}
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground capitalize">
                  {selectedCategory} Detailed Progress
                </h2>
                <p className="font-mono text-muted-foreground text-sm">
                  {categoryAnalytics[selectedCategory].total_workouts} workouts • Working volume growth: {categoryAnalytics[selectedCategory].working_volume_growth}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Working Volume</span>
                </div>
                <p className="text-2xl font-bold text-foreground font-mono">
                  {categoryAnalytics[selectedCategory].working_volume?.toLocaleString() || 0}
                </p>
              </div>

              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Failure Rate</span>
                </div>
                <p className="text-2xl font-bold text-foreground font-mono">
                  {categoryAnalytics[selectedCategory].avg_failure_rate?.toFixed(1) || 0}%
                </p>
              </div>

              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-secondary" />
                  <span className="text-xs text-muted-foreground">Intensity</span>
                </div>
                <p className="text-2xl font-bold text-foreground font-mono">
                  {categoryAnalytics[selectedCategory].avg_intensity?.toFixed(0) || 0}%
                </p>
              </div>

              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Max Weight</span>
                </div>
                <p className="text-2xl font-bold text-foreground font-mono">
                  {categoryAnalytics[selectedCategory].max_weight || 0}kg
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-muted rounded-xl">
              <p className="text-sm font-mono text-muted-foreground mb-3">Set Type Distribution</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: SET_TYPE_COLORS.warmup }} />
                  <span className="text-xs font-mono">W: {categoryAnalytics[selectedCategory].set_totals?.warmup || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: SET_TYPE_COLORS.normal }} />
                  <span className="text-xs font-mono">N: {categoryAnalytics[selectedCategory].set_totals?.normal || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: SET_TYPE_COLORS.failure }} />
                  <span className="text-xs font-mono">F: {categoryAnalytics[selectedCategory].set_totals?.failure || 0}</span>
                </div>
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
                      <div className="flex items-center gap-2">
                        {log.metrics?.setDistribution && (
                          <div className="flex items-center gap-1 text-[10px] font-mono">
                            <span className="text-yellow-600">W{log.metrics.setDistribution.warmup}</span>
                            <span className="text-gray-500">N{log.metrics.setDistribution.normal}</span>
                            <span className="text-red-500">F{log.metrics.setDistribution.failure}</span>
                          </div>
                        )}
                      </div>
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
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import AdminLayout from '@/components/admin-layout'
import { BarChart3, Users, TrendingUp, Clock } from 'lucide-react'

type User = Database['public']['Tables']['users']['Row']
type WorkoutLog = Database['public']['Tables']['workout_logs']['Row']
type CheckIn = Database['public']['Tables']['check_ins']['Row']

export default function AdminAnalyticsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, logsRes, checkInsRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('workout_logs').select('*'),
        supabase.from('check_ins').select('*'),
      ])

      if (usersRes.error) throw usersRes.error
      if (logsRes.error) throw logsRes.error
      if (checkInsRes.error) throw checkInsRes.error

      setUsers(usersRes.data || [])
      setWorkoutLogs(logsRes.data || [])
      setCheckIns(checkInsRes.data || [])
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const getUserStats = (userId: string) => {
    const userLogs = workoutLogs.filter((log) => log.user_id === userId)
    const userCheckIns = checkIns.filter((ci) => ci.user_id === userId)

    const totalWorkouts = userCheckIns.length
    const totalDuration = userCheckIns.reduce((sum, ci) => sum + (ci.duration_minutes || 0), 0)
    const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0
    const totalReps = userLogs.reduce((sum, log) => sum + log.actual_sets * log.actual_reps, 0)

    return {
      totalWorkouts,
      totalDuration,
      avgDuration,
      totalReps,
    }
  }

  const getGymStats = () => {
    const totalUsers = users.filter((u) => u.role === 'user').length
    const totalWorkouts = checkIns.length
    const totalDuration = checkIns.reduce((sum, ci) => sum + (ci.duration_minutes || 0), 0)
    const totalReps = workoutLogs.reduce((sum, log) => sum + log.actual_sets * log.actual_reps, 0)
    const todayCheckIns = checkIns.filter((ci) =>
      ci.check_in_time.startsWith(new Date().toISOString().split('T')[0])
    ).length

    return {
      totalUsers,
      totalWorkouts,
      totalDuration,
      totalReps,
      todayCheckIns,
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-foreground">Loading analytics...</div>
        </div>
      </AdminLayout>
    )
  }

  const gymStats = getGymStats()
  const regularUsers = users.filter((u) => u.role === 'user')

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Gym Analytics
          </h1>
          <p className="font-mono text-muted-foreground">
            Overall gym performance and user progress
          </p>
        </div>

        {/* Gym Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="font-mono text-2xl font-bold text-foreground">{gymStats.totalUsers}</p>
            <p className="font-mono text-xs text-muted-foreground">Total Users</p>
          </div>
          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <BarChart3 className="w-6 h-6 mx-auto mb-2 text-secondary" />
            <p className="font-mono text-2xl font-bold text-foreground">{gymStats.totalWorkouts}</p>
            <p className="font-mono text-xs text-muted-foreground">Total Workouts</p>
          </div>
          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="font-mono text-2xl font-bold text-foreground">
              {Math.round(gymStats.totalDuration / 60)}h
            </p>
            <p className="font-mono text-xs text-muted-foreground">Total Time</p>
          </div>
          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="font-mono text-2xl font-bold text-foreground">{gymStats.totalReps}</p>
            <p className="font-mono text-xs text-muted-foreground">Total Reps</p>
          </div>
          <div className="neo-card bg-card rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="font-mono text-2xl font-bold text-foreground">{gymStats.todayCheckIns}</p>
            <p className="font-mono text-xs text-muted-foreground">Today</p>
          </div>
        </div>

        {/* User Performance Table */}
        <div className="neo-card bg-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">User Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-3 px-4 font-mono text-sm font-bold text-muted-foreground">
                    User
                  </th>
                  <th className="text-center py-3 px-4 font-mono text-sm font-bold text-muted-foreground">
                    Workouts
                  </th>
                  <th className="text-center py-3 px-4 font-mono text-sm font-bold text-muted-foreground">
                    Avg Duration
                  </th>
                  <th className="text-center py-3 px-4 font-mono text-sm font-bold text-muted-foreground">
                    Total Time
                  </th>
                  <th className="text-center py-3 px-4 font-mono text-sm font-bold text-muted-foreground">
                    Total Reps
                  </th>
                </tr>
              </thead>
              <tbody>
                {regularUsers.map((user) => {
                  const stats = getUserStats(user.id)
                  return (
                    <tr key={user.id} className="border-b border-border hover:bg-muted">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ backgroundColor: user.avatar_color }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-foreground">{user.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 font-mono text-foreground">
                        {stats.totalWorkouts}
                      </td>
                      <td className="text-center py-3 px-4 font-mono text-foreground">
                        {stats.avgDuration}m
                      </td>
                      <td className="text-center py-3 px-4 font-mono text-foreground">
                        {Math.round(stats.totalDuration / 60)}h {stats.totalDuration % 60}m
                      </td>
                      <td className="text-center py-3 px-4 font-mono text-foreground">
                        {stats.totalReps}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {regularUsers.length === 0 && (
            <p className="text-center text-muted-foreground font-mono py-8">
              No users to display
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

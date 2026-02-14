'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import AdminLayout from '@/components/admin-layout'
import { Users, Dumbbell, BarChart3, Clock, TrendingUp } from 'lucide-react'

type User = Database['public']['Tables']['users']['Row']
type CheckIn = Database['public']['Tables']['check_ins']['Row']

export default function AdminDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (userError) throw userError

      // Fetch recent check-ins
      const { data: checkInData, error: checkInError } = await supabase
        .from('check_ins')
        .select('*, users(name)')
        .order('check_in_time', { ascending: false })
        .limit(10)

      if (checkInError) throw checkInError

      setUsers(userData || [])
      setCheckIns(checkInData || [])
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalUsers = users.length
  const regularUsers = users.filter((u) => u.role === 'user').length
  const todayCheckIns = checkIns.filter((ci) =>
    ci.check_in_time.startsWith(new Date().toISOString().split('T')[0])
  ).length
  const totalWorkoutTime = checkIns.reduce((sum, ci) => sum + (ci.duration_minutes || 0), 0)

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-foreground">Loading dashboard...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Admin Dashboard
          </h1>
          <p className="font-mono text-muted-foreground">
            Manage your gym and track user activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="neo-card bg-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-primary" />
              <span className="text-xs font-mono text-muted-foreground">TOTAL</span>
            </div>
            <p className="text-4xl font-bold text-foreground font-mono">{totalUsers}</p>
            <p className="text-sm text-muted-foreground mt-2">Users</p>
          </div>

          <div className="neo-card bg-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-secondary" />
              <span className="text-xs font-mono text-muted-foreground">ACTIVE</span>
            </div>
            <p className="text-4xl font-bold text-foreground font-mono">{regularUsers}</p>
            <p className="text-sm text-muted-foreground mt-2">Gym Users</p>
          </div>

          <div className="neo-card bg-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-accent" />
              <span className="text-xs font-mono text-muted-foreground">TODAY</span>
            </div>
            <p className="text-4xl font-bold text-foreground font-mono">{todayCheckIns}</p>
            <p className="text-sm text-muted-foreground mt-2">Check-ins</p>
          </div>

          <div className="neo-card bg-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-destructive" />
              <span className="text-xs font-mono text-muted-foreground">TOTAL</span>
            </div>
            <p className="text-4xl font-bold text-foreground font-mono">{Math.round(totalWorkoutTime / 60)}h</p>
            <p className="text-sm text-muted-foreground mt-2">Workout Time</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/admin/users')}
            className="neo-card bg-card rounded-2xl p-6 text-left hover:scale-[1.02] transition-all group"
          >
            <Users className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Manage Users</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add, edit, or remove gym users
            </p>
            <span className="text-primary font-mono text-sm font-bold group-hover:underline">
              Go to Users →
            </span>
          </button>

          <button
            onClick={() => router.push('/admin/exercises')}
            className="neo-card bg-card rounded-2xl p-6 text-left hover:scale-[1.02] transition-all group"
          >
            <Dumbbell className="w-12 h-12 text-secondary mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Manage Exercises</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create and update workout routines
            </p>
            <span className="text-secondary font-mono text-sm font-bold group-hover:underline">
              Go to Exercises →
            </span>
          </button>

          <button
            onClick={() => router.push('/admin/analytics')}
            className="neo-card bg-card rounded-2xl p-6 text-left hover:scale-[1.02] transition-all group"
          >
            <BarChart3 className="w-12 h-12 text-accent mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">View Analytics</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track gym performance and user progress
            </p>
            <span className="text-accent font-mono text-sm font-bold group-hover:underline">
              Go to Analytics →
            </span>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="neo-card bg-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Recent Activity</h2>
          {checkIns.length > 0 ? (
            <div className="space-y-3">
              {checkIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-xl border-2 border-border"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                      style={{ backgroundColor: '#4ECDC4' }}
                    >
                      {(checkIn as any).users?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">
                        {(checkIn as any).users?.name || 'Unknown User'}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {new Date(checkIn.check_in_time).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {checkIn.check_out_time ? (
                      <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold font-mono">
                        {checkIn.duration_minutes}m
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold font-mono">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground font-mono py-8">
              No recent activity
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
